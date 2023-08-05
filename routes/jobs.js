const express = require('express')
const testUser = require(`../middleware/testUser`)

const router = express.Router()
const {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
  getJob,
  showStats,
} = require('../controllers/jobs')

router.route('/').post(testUser, createJob).get(getAllJobs)
// this should go before `/:id`. Otherwise, express
// will think that `/stats` is one of the `:id` routes
router.route(`/stats`).get(showStats)
//
router.route('/:id').get(getJob).delete(testUser, deleteJob).patch(testUser, updateJob)

module.exports = router