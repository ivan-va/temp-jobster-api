const Job = require('../models/Job')
const { StatusCodes } = require('http-status-codes')
const { BadRequestError, NotFoundError } = require('../errors')
const mongoose = require(`mongoose`)
const moment = require(`moment`)


async function getAllJobs(req, res) {
  // the query is programmed in the front-end, and you
  // can see it in dev tools `Network` tab
  const {search, status, jobType, sort} = req.query

  const queryObject = {
    createdBy: req.user.userId
  }

  // if the search query exists
  if (search) {
    queryObject.position = {$regex: search, $options: 'i'}
  }
  // add stuff based on conditions
  if (status && status !== `all`) {
    queryObject.status = status
  }

  if (jobType && jobType !== `all`) {
    queryObject.jobType = jobType
  }

  let result = Job.find(queryObject)
  // chain sort conditions
  if (sort === `latest`) {
    result = result.sort(`-createdAt`)
  }
  if (sort === `oldest`) {
    result = result.sort(`createdAt`)
  }
  if (sort === `a-z`) {
    result = result.sort(`position`)
  }
  if (sort === `z-a`) {
    result = result.sort(`-position`)
  }
  // pagination
  const page = Number(req.query.page) || 5
  // we don't have this setting coming from the front-end,
  // but this can be configured
  const limit = Number(req.query.limit) || 10
  // how many items to skip on the current page
  const skip = (page - 1) * limit

  result = result.skip(skip).limit(limit)

  const jobs = await result
  // calculate how many total jobs we have, and then
  // derive the number of pages we need from that
  const totalJobs = await Job.countDocuments(queryObject)
  const numOfPages = Math.ceil(totalJobs / limit)
  //

  res.status(StatusCodes.OK).json({ jobs, totalJobs, numOfPages })
}

async function getJob(req, res) {
  const {
    user: { userId },
    params: { id: jobId },
  } = req

  const job = await Job.findOne({
    _id: jobId,
    createdBy: userId,
  })
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).json({ job })
}

const createJob = async (req, res) => {
  req.body.createdBy = req.user.userId
  const job = await Job.create(req.body)
  res.status(StatusCodes.CREATED).json({ job })
}

const updateJob = async (req, res) => {
  const {
    body: { company, position },
    user: { userId },
    params: { id: jobId },
  } = req

  if (company === '' || position === '') {
    throw new BadRequestError('Company or Position fields cannot be empty')
  }
  const job = await Job.findByIdAndUpdate(
    { _id: jobId, createdBy: userId },
    req.body,
    { new: true, runValidators: true }
  )
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).json({ job })
}

const deleteJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req

  const job = await Job.findByIdAndRemove({
    _id: jobId,
    createdBy: userId,
  })
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).send()
}

async function showStats(req, res) {
  let stats = await Job.aggregate([
    {$match: {createdBy: mongoose.Types.ObjectId(req.user.userId)}},
    {$group: {_id: '$status', count: {$sum: 1}}}
  ])

  // stat counter that goes through each stat data and sums it,
  // according to its title
  stats = stats.reduce((acc, curr) => {
    const {_id: title, count} = curr
    acc[title] = count
    return acc
  }, {})

  // data sanity check
  const defaultStats = {
    pending: stats.pending || 0,
    interview: stats.interview || 0,
    declined: stats.declined || 0,
  }

  let monthlyApplications = await Job.aggregate([
    {$match: {createdBy: mongoose.Types.ObjectId(req.user.userId)}},
    {
      $group: {
        _id: {year: {$year: '$createdAt'}, month:{$month: '$createdAt'}},
        count: {$sum: 1},
      },
    },
    {$sort: {'_id.year': -1, '_id.month': -1}},
    {$limit: 6},
  ])  
  
  monthlyApplications.map( (i) => {
    const {
      _id: {year, month},
      count,
    } = i

    const date = moment().month(month - 1).year(year).format(`MMM Y`)

    return {date, count}
  })
  .reverse()


  console.log(monthlyApplications)

  res
    .status(StatusCodes.OK)
    .json({defaultStats, monthlyApplications: []})
}

module.exports = {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
  getJob,
  showStats,
}
