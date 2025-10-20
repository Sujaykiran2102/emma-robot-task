# Emma Robot - Round 1 Task: Kaggle to HubSpot Data Pipeline

## Description

This project is a fully automated data pipeline built in Node.js and TypeScript. It performs the following actions:
1.  Launches a headless browser using Playwright to log into Kaggle.com.
2.  Navigates to a specific dataset and downloads a ZIP archive containing baby names.
3.  Unzips the archive, parses the CSV data, and extracts the 'Name' and 'Sex' for over 1.8 million records.
4.  Stores these records in a local MySQL database using the Sequelize ORM.
5.  Fetches the data from the database and syncs it to HubSpot, creating a new contact for each record.

---

## Tech Stack

-   **Runtime:** Node.js
-   **Language:** TypeScript
-   **Browser Automation:** Playwright
-   **Database:** MySQL
-   **ORM:** Sequelize
-   **API Client:** Axios
-   **Utilities:** `csv-parser`, `unzipper`, `dotenv`

---

## Setup and Installation

### Prerequisites

-   Node.js (v18 or later)
-   MySQL Server installed and running locally.

### Steps

1.  **Clone the repository and install dependencies:**
    ```bash
    git clone <your-repo-url>
    cd emma-robot-task
    npm install
    ```

2.  **Create the database:**
    Connect to your local MySQL instance and run the following command:
    ```sql
    CREATE DATABASE emma_robot_db;
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root of the project. Copy the contents of `.env.example` and fill in your credentials.
    ```
    KAGGLE_EMAIL="your-kaggle-email@example.com"
    KAGGLE_PASSWORD="your-kaggle-password"
    MYSQL_PASSWORD="your-mysql-root-password"
    HUBSPOT_API_TOKEN="pa-pat-your-hubspot-private-app-token"
    ```

4.  **Run Database Migrations:**
    This command will create the `BabyNames` table in your database.
    ```bash
    npx sequelize-cli db:migrate
    ```

---

## How to Run

There are two main scripts to run in order:

1.  **Scrape and Store Data:**
    This script runs the entire process of downloading the data from Kaggle and saving it to the MySQL database.
    ```bash
    npm run scrape
    ```

2.  **Sync to HubSpot:**
    After the scrape is complete, run this script to sync the first 100 records from the database to your HubSpot account.
    ```bash
    npm run sync
    ```