const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema({
    hostId: {
        type: String,
    },
    roomId: {
        type: String,
        required: true,
    },
    participant:{
        type:Number,
        default:0,        
    }
});

module.exports = mongoose.model('room', roomSchema);