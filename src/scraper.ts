import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import unzipper from 'unzipper';
import { Sequelize , DataTypes } from 'sequelize';

dotenv.config();

const sequelize = new Sequelize('emma_robot_db', 'root', process.env.MYSQL_PASSWORD, {
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false
});

// Define the BabyName model structure
const BabyName = sequelize.define('BabyName', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sex: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {});

async function processAndStoreData(zipFilePath: string) {
    const records: { name: string; sex: string }[] = [];
    console.log('📄 Starting to process the downloaded ZIP file...');

    return new Promise<void>((resolve, reject) => {
        fs.createReadStream(zipFilePath)
            .pipe(unzipper.Parse()) // Pipe the ZIP file stream to the unzipper
            .on('entry', function (entry) {
                const fileName = entry.path;
                if (fileName === "babyNamesUSYOB-full.csv") {
                    console.log(`Found ${fileName} inside the archive. Parsing now...`);
                    entry.pipe(csv()) // Pipe the unzipped file stream to the CSV parser
                        .on('data', (row: { Name?: string; Sex?: string }) => {
                            if (row.Name && row.Sex) {
                                records.push({ name: row.Name, sex: row.Sex });
                            }
                        })
                        .on('end', async () => {
                            console.log(`CSV file successfully processed. Found ${records.length} records.`);
                            try {
                                if (records.length > 0) {
                                    console.log('🗄️ Inserting records into the database in batches...');
                                    const BATCH_SIZE = 1000;
                                    for (let i = 0; i < records.length; i += BATCH_SIZE) {
                                        const batch = records.slice(i, i + BATCH_SIZE);
                                        await BabyName.bulkCreate(batch);
                                    }
                                    console.log('✅ Database insertion complete!');
                                }
                                resolve();
                            } catch (dbError) {
                                console.error('Error inserting data into the database:', dbError);
                                reject(dbError);
                            }
                        });
                } else {
                    // Discard other files in the ZIP, if any
                    entry.autodrain();
                }
            })
            .on('error', (err) => {
                console.error('Error processing ZIP file:', err);
                reject(err);
            });
    });
}

async function main() {
  console.log('🤖 Starting the scraper...');

  // 1. LAUNCH THE BROWSER
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 2. LOG IN TO KAGGLE
  console.log('Navigating to Kaggle login page...');
  await page.goto('https://www.kaggle.com/account/login');

  await page.locator('span:has-text("Sign in with email")').click(); 
  console.log('Clicked "Sign in with email" to reveal form...');

  await page.locator('input[name="email"]').fill(process.env.KAGGLE_EMAIL!);
  await page.locator('input[name="password"]').fill(process.env.KAGGLE_PASSWORD!);

  await page.locator('button:has-text("Sign In")').click();
  console.log('Logging in...');

  await page.waitForURL('https://www.kaggle.com/');
  console.log('✅ Successfully logged in!');


// 3. NAVIGATE AND DOWNLOAD THE FILE
  const datasetUrl = 'https://www.kaggle.com/datasets/thedevastator/us-baby-names-by-year-of-birth?select=babyNamesUSYOB-full.csv';
  console.log(`Navigating to dataset page: ${datasetUrl}`);
  await page.goto(datasetUrl);

  try {
    console.log('Checking for cookie banner...');
    await page.locator('button:has-text("Accept")').click({ timeout: 5000 });
    console.log('✅ Cookie banner accepted.');
  } catch (error) {
    console.log('Cookie banner not found or already accepted, continuing...');
  }

  const downloadPromise = page.waitForEvent('download');
  
  // Use getByLabel to be hyper-specific and avoid ambiguity.
  console.log('Looking for the specific download label...');
  await page.getByLabel('Download').click();
  console.log('Download button clicked. Waiting for download to start...');

  const download = await downloadPromise;
  
  const downloadPath = path.join(__dirname, '../data/babyNamesUSYOB-full.csv');
  
  await download.saveAs(downloadPath);
  console.log(`✅ File downloaded and saved to: ${downloadPath}`);

  // 4. CLOSE THE BROWSER
  await browser.close();
  console.log('Browser closed. Scraper finished.');
  // --- End of scraper code ---

  await processAndStoreData(downloadPath);
}

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});