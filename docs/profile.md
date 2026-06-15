# Profile

The Profile page lets each user manage their own account information, change their password, and configure two-factor authentication. It is accessible from the user menu in the top-right corner.

![Profile page overview](/_images/profile-overview.png)

## User Information

| Field | Description |
|-------|-------------|
| Username | Your login name |
| Firstname | First name (shown in reports as collaborator) |
| Lastname | Last name |
| Email | Email address |
| Phone | Phone number |

Your current **Role** is shown at the top as a colored chip (orange for admin, blue for other roles).

Edit any field and click **Update** (or press Enter in the password field) to save. You must provide your **current password** to confirm the changes.

## Change Password

Enter a new password in the **New Password** and **Confirm Password** fields, then provide your **Current Password** and click **Update**.

Password requirements are enforced — the form will display an error if the new password does not meet the policy.

## Two-Factor Authentication

PwnDoc supports TOTP-based two-factor authentication (compatible with apps like Google Authenticator, Authy, or any TOTP-compatible app).

![2FA setup showing QR code and TOTP token field](/_images/profile-2fa-setup.png)

### Enable 2FA

1. Toggle **Two-factor authentication** on.
2. Install a TOTP app on your phone (Google Authenticator, Authy, etc.).
3. Open the app and add a new account by scanning the QR code shown on screen.
4. Enter the 6-digit token from your app and click **Enable**.

Once enabled, you will be prompted for your TOTP token on each login after entering your password.

### Disable 2FA

1. Toggle **Two-factor authentication** off.
2. Enter your current 6-digit TOTP token to confirm.
3. Click **Disable**.

> Disabling 2FA removes the second authentication factor from your account immediately.

### Status

When 2FA is active, the section shows: *"Your account is currently protected by 2 factor authentication."*
