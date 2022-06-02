// const superagent = require("request");
const axios = require("axios").default;
// const puppeteer = require("puppeteer");

const cheerio = require("cheerio");
const mysql = require("mysql");
const config = require("config");
const dbConfig = config.get("dbConfig");
const nodeCron = require("node-cron");

const connection = mysql.createConnection(dbConfig);

const verifiedContracts = [];
const chainScaners = {
  ETH: (i) => `https://etherscan.io/contractsVerified/${i}?ps=100`,
  // BSC: (i) => `https://bscscan.com/contractsVerified/${i}?ps=100`,
  AVAX: (i) => `https://snowtrace.io/contractsVerified/${i}?ps=100`,
};
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const parseHtml = (html, chain) => {
  let $ = cheerio.load(html);
  $("tbody tr").each((idx, ele) => {
    let contract = {
      address: $(ele).children("td:nth-child(1)").text().trim(),
      name: $(ele).children("td:nth-child(2)").text().trim(),
      Verified: $(ele).children("td:nth-child(8)").text().trim(),
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
  // const browser = await puppeteer.launch();
  // const page = await browser.newPage();
  for (let chain in chainScaners) {
    
    for (let i = 1; i <= 5; ) {
      try {
        console.log(`${chainScaners[chain](i)} verifid Contracts data start fetching.`);
        const res = await axios.get(chainScaners[chain](i), {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.122 Safari/537.36 SE 2.X MetaSr 1.0",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "Accept-Language":
              "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,ko;q=0.6,zh-TW;q=0.5,fr;q=0.4,cy;q=0.3",
          },
        }); 

        parseHtml(res.data, chain);

        console.log(`${chain} ${i}00 verifid Contracts done.`);
        await sleep(20000);
        i++;
      } catch (error) {
        console.error(`Can\'t fetch ` + chainScaners[chain](i), error);
        await sleep(20000);
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
      results[0]["Count(*)"], new Date()
    );
    fetch();
    connection.end(() => {
      console.log('Disconnected Database.', new Date());
    });
  });
};
// main();

const job = nodeCron.schedule("0 0 0 * * *", main.bind(null, false));
console.log(
  "Verifid Contracts fetch cronjob started. The Job will be actived at 00:00:00."
);
