const XLSX = require('xlsx');
const wb = XLSX.readFile('public/test-workbook.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);
console.log('Sheet:', wb.SheetNames[0]);
console.log('Columns:', Object.keys(data[0] || {}));
console.log('Total Rows:', data.length);
for (let i = 0; i < Math.min(10, data.length); i++) {
  console.log('Row ' + (i+1) + ':', JSON.stringify(data[i]));
}
