const mongoose = require('mongoose')

const UserSchemma = new mongoose.Schema({
    email : {
        type : String,
        unique : true,
        trim : true,
        lowercase : true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
        index : true,
        required : [true,'Email is required']
    },
    favouriteTrips : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Trip',
        validate: {
            validator: function(v) {
                return mongoose.Types.ObjectId.isValid(v);
            },
            message: props => `${props.value} is not a valid trip ID!`
    }
    }],
    verificationCode : {
        type : Number,
    },
    isVerificated : {
        type : Boolean,
        default : false
    },
    password : {
        type : String,
        trim : true,
        minlength : [8,'You should create a password of 8 characters or more'],
        select : false,
        required : [true,'Password is required']
    }
},{timestamps : true})

module.exports = mongoose.model('User', UserSchemma);