const chromium = require('chrome-aws-lambda');

module.exports = async function getData() {
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  let page = await browser.newPage();

  await page.goto('https://www.everydollar.com/app/sign-in');

  await page.waitForSelector('#emailInput');
  await page.type('#emailInput', process.env.EVERYDOLLAR_USERNAME);
  await page.click('#emailForm [type="submit"]');

  await new Promise(resolve => setTimeout(resolve, 3000));

  await page.waitForSelector('.auth0-lock-input[name="password"]');
  await page.type('.auth0-lock-input[name="password"]', process.env.EVERYDOLLAR_PASSWORD);
  await page.click('.auth0-lock-submit[name="submit"]');

  await new Promise(resolve => setTimeout(resolve, 3000));
  await page.waitForSelector('.BudgetNavigation-date');

  const data = await page.evaluate(async () => {
    function pad(n) {
      return (n < 10) ? ("0" + n) : n;
    }

    function getMonthlyBudgetItems(isCurrentMonth = true) {
      const budgetItems = [];

      document.querySelectorAll('.BudgetItemRow').forEach(item => {
        const dayWrapper = item.querySelector('.BudgetItemRow-column > .BudgetItem-label--secondary')?.innerText;

        if (item?.querySelector(".BudgetItemRow-input[placeholder='Budget Item Label']")?.closest('.Budget-budgetGroup').classList.contains('Budget-budgetGroup--favorites')) return;

        if (dayWrapper) {
          const monthText = dayWrapper.split(' ')[1];
          const month = new Date(Date.parse(monthText +" 1, 2012")).getMonth()+1;
          const day = pad(dayWrapper.split(' ')[2].split('').filter(item => !isNaN(item)).join(''));
          let year = new Date().getFullYear();
          if (!isCurrentMonth && parseInt(month) === 1) {
            year+=1;
          }
          const dueDate = new Date(year+'-'+month+'-'+day);
          const remaining = item.querySelector(".BudgetItemRow-column:last-child .BudgetItem-secondColumn").dataset.text.split('');

          remaining.shift();

          let newRemaining;
          if (item.classList.contains('DebtBudgetItemRow--minimumPayment')) {
            const budgeted = item.querySelector(".BudgetItemRow-input--amountBudgeted").value.split('');
            budgeted.shift();

            const newBudgeted = budgeted.join('');
            const paid = remaining.join('');

            newRemaining = parseFloat(newBudgeted) - parseFloat(paid);
          } else {
            const tmpRemaining = remaining.join('');
            newRemaining = parseFloat(tmpRemaining);
          }

          if (parseInt(newRemaining)) {
            budgetItems.push({
              name: item.querySelector(".BudgetItemRow-input[placeholder='Budget Item Label']").value,
              remaining: newRemaining,
              dueDate: dueDate.toString(),
            });
          }
        } else {
          const remaining = item.querySelector(".BudgetItemRow-column:last-child .BudgetItem-secondColumn").dataset.text.split('');
          remaining.shift();
          let newRemaining;

          if (item.closest('.Budget-budgetGroup')?.querySelector('.BudgetGroupHeader-CardTab span:nth-of-type(2)')?.innerText === 'Savings') {
            const budgeted = item.querySelector(".BudgetItemRow-input--amountBudgeted").value.split('');
            budgeted.shift();

            const newBudgeted = budgeted.join('');
            newRemaining = newBudgeted;
          } else {
            newRemaining = remaining.join('');
          }

          if (item?.querySelector(".BudgetItemRow-input[placeholder='Budget Item Label']")?.closest('.Budget-budgetGroup').classList.contains('Budget-budgetGroup--expense')) {
            if (parseInt(newRemaining)) {
              budgetItems.push({
                name: item.querySelector(".BudgetItemRow-input[placeholder='Budget Item Label']").value,
                remaining: newRemaining,
                dueDate: null
              });
            }
          }
        }
      });

      return budgetItems;
    }

    const thisMonthsBudgetItems = getMonthlyBudgetItems();

    const budgetTitle = document.querySelector('.BudgetNavigation-date');
    if (budgetTitle) {
      budgetTitle.click();
      document.querySelector('.MonthPicker-month--current').nextElementSibling.click();

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const nextMonthsBudgetedItems = budgetTitle ? getMonthlyBudgetItems(false) : {};

    return [ ...thisMonthsBudgetItems, ...nextMonthsBudgetedItems ];
  });

  return data;
}
