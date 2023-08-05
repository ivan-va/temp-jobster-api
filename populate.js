require('dotenv').config()

const mockData = require('./mock-data')
const Job = require('./models/Job')
const connectDB = require('./db/connect')

async function start() {
	try {
		await connectDB(process.env.MONGO_URI)
		// take all entries from mockData and add them to the jobs
		// collection
		await Job.create(mockData)
		//
		console.log(`Success!!!`)
		process.exit(0)
	} catch(err) {
		console.log(err)
		process.exit(1)
	}
}

start()