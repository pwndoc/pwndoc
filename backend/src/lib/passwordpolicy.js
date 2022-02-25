// Check if user's password match password policy
function strongPassword(password) {
 
        var regExp = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%&*()]).{8,}/;
        var validPassword = regExp.test(password);
        return validPassword;
}
exports.strongPassword = strongPassword