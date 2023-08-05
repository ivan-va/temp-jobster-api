const {BadRequestError} = require(`../errors`)

function testUser(req, res, next) {
	if (req.user.testUser) {
		throw new BadRequestError(`Test user! Read only.`)
	}
}

module.exports = testUser