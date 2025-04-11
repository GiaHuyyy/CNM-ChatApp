const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    phone : {
        type: String,
        required: [true, 'Please provide a phone number'],
        unique: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Please provide a password']
    },
    name : {
        type: String,
        required: [true, 'Please provide a name']
    },
    profilePic: {
        type: String,
        default: ''
    },
}, {
    timestamps: true
})

const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;