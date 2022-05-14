import fetch from 'node-fetch';
import dotenv from 'dotenv';
import getData from './testData.js';

dotenv.config();

(async () => {
  // const url = `${process.env.API_ENDPOINT}`
  // const options = { headers: { 'napkin-account-api-key': `${process.env.API_KEY}` } };
  // const response = await fetch(url, options);
  // const data = await response.json();
  const data = getData();
  const sortedData = data.budget.slice().sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  console.log(sortedData);
})()