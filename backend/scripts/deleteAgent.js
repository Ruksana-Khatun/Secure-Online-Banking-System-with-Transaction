// One-time script to delete existing agent record
import mongoose from 'mongoose';
import AepsAgent from '../models/AepsAgent.model.js';

async function deleteExistingAgent() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/secure-banking');
    console.log('Connected to MongoDB');

    // Delete the specific agent
    const result = await AepsAgent.deleteOne({ _id: '69bc5f7de486926562ac0fb8' });
    
    console.log('Delete result:', result);
    
    if (result.deletedCount > 0) {
      console.log('✅ Successfully deleted agent record');
    } else {
      console.log('❌ Agent record not found');
    }

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteExistingAgent();
