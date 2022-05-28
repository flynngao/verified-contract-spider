const superagent = require("superagent");
const cheerio = require("cheerio");
const fs = require("fs");
const mysql = require("mysql");
const config = require("config");
const dbConfig = config.get("dbConfig");
const nodeCron = require("node-cron");

const connection = mysql.createConnection(dbConfig);

const verifiedContracts = [];
const chainScaners = {
  ETH: (i) => `https://etherscan.io/contractsVerified/${i}?ps=100`,
  BSC: (i) => `https://bscscan.com/contractsVerified/${i}?ps=100`,
  AVAX: (i) => `https://snowtrace.io/contractsVerified/${i}?ps=100`,
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const parseHtml = (res, chain) => {
  let $ = cheerio.load(res.text);
  $("tbody tr").each((idx, ele) => {
    let contract = {
      address: $(ele).children("td:nth-child(1)").text(),
      name: $(ele).children("td:nth-child(2)").text(),
      Verified: $(ele).children("td:nth-child(8)").text(),
      chain,
    };
    var addSql = "INSERT INTO evm_contracts(name,chain,address) VALUES(?,?,?)";
    var addSqlParams = [contract.name, contract.chain, contract.address];
    //增
    connection.query(addSql, addSqlParams, function (err, result) {
      if (err) {
        console.error("[INSERT ERROR] - ", err.message);
        return;
      }
      console.log("INSERT ID:", result.insertId);
      // console.log("INSERT ID:", result);
    });
    // verifiedContracts.push(contract);
  });
};

const fetch = async () => {
  for (let chain in chainScaners) {
    console.log(`${chain} verifid Contracts data start fetching.`);
    for (let i = 1; i <= 5; ) {
      try {
        const res = await superagent.get(chainScaners[chain](i));
        parseHtml(res, chain);
        await sleep(100);
        console.log(`${chain} ${i}00 verifid Contracts done.`);
        i++;
      } catch (error) {
        console.error(
          `Can\'t fetch https://etherscan.io/contractsVerified/${i}?ps=100`,
          error
        );
      }
    }
    console.log(`${chain} all verifid Contracts done.`);
  }
  console.log(`Counts of Contracts ${verifiedContracts.length}`);
  connection.end();
};

const main = () => {
  connection.connect();

  connection.query("SELECT Count(*) from evm_contracts", function (
    error,
    results
  ) {
    if (error) throw error;
    console.log(
      "Connected Database, The count of contracts is:",
      results[0]["Count(*)"]
    );
    fetch();
  });
};
// main();

const job = nodeCron.schedule("0 0 0 * * *", main.bind(null, false));
console.log('Verifid Contracts fetch cronjob started. The Job will be actived at 00:00:00.')
