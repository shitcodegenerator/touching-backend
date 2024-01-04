const mongoose = require("mongoose")

const connectDb = async () => {
    try {
        const connect = await mongoose.connect(process.env.MONGOOSE_CONNTECTION_STRING)
        console.log('DB connected', connect.connection.host, connect.connection.name)
    } catch (err) {
        console.log(err)
        process.exit(1)
    }
}

module.exports = connectDb