const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/payteam');
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 50,
        minlength: 3,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        maxlength: 20,
        minlength: 8,

        
    },
    fastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
       
    }
  
    });
    const userModel = mongoose.model('users', userSchema);
    model.exports = {
        userModel
    };