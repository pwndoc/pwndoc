// Check if user's password match password policy
function strongPassword(password) {
        var regExp = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/;
        return regExp.test(password);
}

exports.strongPassword = strongPassword