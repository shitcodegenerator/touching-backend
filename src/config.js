const mongoose = require("mongoose")

const connectDb = async () => {
    try {
        const connect = await mongoose.connect(process.env.MONGOOSE_CONNTECTION_STRING,
            {
                connectTimeoutMS: 30000,     // 30 秒的連接超時
                socketTimeoutMS: 45000,      // 45 秒的socket超時
                maxPoolSize: 10,             // 最大連接數     
            })
        console.log('DB connected', connect.connection.host, connect.connection.name)
    } catch (err) {
        console.log(err, 'error on backend')
        process.exit(1)
    }
}

module.exports = connectDb