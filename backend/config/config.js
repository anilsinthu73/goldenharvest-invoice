const path = require("path");
const fs = require("fs-extra");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../.env") });

const pdfDir = path.join(__dirname, "../pdf_files");
fs.ensureDirSync(pdfDir);

const API_URL = process.env.API_URL;
const API_BASE_URL = process.env.API_BASE_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

module.exports = { pdfDir, API_URL,API_BASE_URL, FRONTEND_URL };
