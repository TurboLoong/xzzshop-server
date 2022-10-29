const mysql = require("think-model-mysql");

module.exports = {
  handle: mysql,
  database: "xzzshop",
  prefix: "xzzshop_",
  encoding: "utf8mb4",
  host: "10.28.104.244",
  port: "3306",
  user: "root",
  password: "Xyl2312987772",
  dateStrings: true,
};
