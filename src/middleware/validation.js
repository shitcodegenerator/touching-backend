const Joi = require('joi');

// Generic validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        data: false,
        message: '輸入格式錯誤',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Common validation schemas
const schemas = {
  // User registration
  register: Joi.object({
    username: Joi.string().email().required().messages({
      'string.email': '請輸入有效的電子郵件地址',
      'any.required': '電子郵件地址為必填欄位'
    }),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
      'string.min': '密碼長度至少需要8個字元',
      'string.pattern.base': '密碼必須包含大小寫字母和數字',
      'any.required': '密碼為必填欄位'
    }),
    name: Joi.string().min(1).max(50).required().messages({
      'string.min': '姓名不能為空',
      'string.max': '姓名不能超過50個字元',
      'any.required': '姓名為必填欄位'
    })
  }),

  // User login
  login: Joi.object({
    username: Joi.string().email().required().messages({
      'string.email': '請輸入有效的電子郵件地址',
      'any.required': '電子郵件地址為必填欄位'
    }),
    password: Joi.string().required().messages({
      'any.required': '密碼為必填欄位'
    })
  }),

  // Password reset request
  passwordReset: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': '請輸入有效的電子郵件地址',
      'any.required': '電子郵件地址為必填欄位'
    })
  }),

  // Questionnaire creation
  questionnaireCreate: Joi.object({
    initiatorName: Joi.string().min(1).max(50).required().messages({
      'string.min': '發起人姓名不能為空',
      'string.max': '發起人姓名不能超過50個字元',
      'any.required': '發起人姓名為必填欄位'
    }),
    phone: Joi.string().pattern(/^09\d{8}$/).optional().messages({
      'string.pattern.base': '請輸入有效的台灣手機號碼格式（09xxxxxxxx）'
    }),
    lineId: Joi.string().max(100).optional().messages({
      'string.max': 'LINE ID不能超過100個字元'
    }),
    location: Joi.string().min(1).max(200).required().messages({
      'string.min': '地址不能為空',
      'string.max': '地址不能超過200個字元',
      'any.required': '地址為必填欄位'
    }),
    title: Joi.string().min(1).max(100).required().messages({
      'string.min': '標題不能為空',
      'string.max': '標題不能超過100個字元',
      'any.required': '標題為必填欄位'
    }),
    description: Joi.string().max(1000).optional().messages({
      'string.max': '描述不能超過1000個字元'
    })
  }),

  // Questionnaire response
  questionnaireResponse: Joi.object({
    supportLevel: Joi.string().valid('very_supportive', 'supportive', 'neutral', 'not_supportive', 'very_not_supportive').required().messages({
      'any.only': '請選擇有效的支持程度',
      'any.required': '支持程度為必填欄位'
    }),
    opinion: Joi.string().max(500).optional().messages({
      'string.max': '意見不能超過500個字元'
    }),
    nickname: Joi.string().max(50).optional().messages({
      'string.max': '暱稱不能超過50個字元'
    }),
    contact: Joi.string().max(100).optional().messages({
      'string.max': '聯絡方式不能超過100個字元'
    })
  })
};

module.exports = {
  validateRequest,
  schemas
};