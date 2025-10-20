import { Sequelize, DataTypes } from 'sequelize';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

// Define the shape of our data record with an interface 
interface BabyNameRecord {
    name: string;
    sex: string;
}

// --- Database Setup ---
const sequelize = new Sequelize('emma_robot_db', 'root', process.env.MYSQL_PASSWORD, {
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false,
});

const BabyName = sequelize.define('BabyName', {
    name: { type: DataTypes.STRING, allowNull: false },
    sex: { type: DataTypes.STRING, allowNull: false }
}, {
    tableName: 'BabyNames',
    timestamps: false
});
// --- End of Database Setup ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function syncToHubSpot() {

    console.log('🔗 Starting HubSpot sync...');
    
    const records = await BabyName.findAll({ raw: true }) as unknown as BabyNameRecord[];
    console.log(`Found ${records.length} records in the database to sync.`);
    
    const recordsToSync = records.slice(0, 100); 
    console.log(`Attempting to sync the first ${recordsToSync.length} records...`);

    for (let i = 0; i < recordsToSync.length; i++) {
        const record = recordsToSync[i];
        
        const hubspotContact = {
            properties: {
                firstname: record.name,
                gender: record.sex
            }
        };

        try {
            await axios.post(
                'https://api.hubapi.com/crm/v3/objects/contacts',
                hubspotContact,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log(`[${i + 1}/${recordsToSync.length}] ✅ Successfully created contact: ${record.name}`);

        } catch (error: any) {
            console.error(`[${i + 1}/${recordsToSync.length}] ❌ Failed to create contact for ${record.name}:`, error.response?.data?.message || error.message);
        }
        
        await delay(150);
    }

    console.log('Sync complete!');
}

syncToHubSpot().catch(error => {
    console.error("An error occurred during the HubSpot sync:", error);
});