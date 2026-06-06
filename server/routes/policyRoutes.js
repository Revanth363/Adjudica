const express = require('express');
const { getPolicyTerms, updatePolicyTerms } = require('../controllers/policyController');
const router = express.Router();

router.route('/').get(getPolicyTerms).put(updatePolicyTerms);

module.exports = router;
