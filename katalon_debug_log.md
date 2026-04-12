# 🧪 Katalon Test Case Debugging Log

Gunakan dokumen ini untuk mendata setiap Test Case yang gagal, memerlukan intervensi manual, atau memiliki error saat dijalankan di Katalon Studio.

---

## 📝 [ID_TEST_CASE] - [Nama Test Case]

**Status**: 🔴 Failed / 🟡 Manual Run / 🟠 Pending
**Kategori Error**: (Contoh: WebElementNotFound, NullPointerException, Timeout, dsb)

### 1. Deskripsi Masalah

- **Aksi Terakhir**: (Apa yang dilakukan Katalon sebelum error? Misal: Klik tombol Register)
- **Ekspektasi**: (Apa yang seharusnya terjadi? Misal: Pindah ke layar OTP)
- **Kenyataan**: (Apa yang terjadi? Misal: Muncul pesan error merah "Failed to send...")

### 2. Katalon Script (Groovy)

```groovy
// Paste kode dari Katalon Studio yang bermasalah di sini
```

### 3. Error Log / Console Output

```text
// Paste pesan error lengkap dari console Katalon di sini
```

### 4. Source Code Terkait (Optional)

```jsx
// Jika Anda merasa masalahnya ada di kodingan (seperti ID atau State), paste kodenya di sini
```

### 5. Analisis & Solusi (Update berkala)

- **Penyebab**: ...
- **Tindakan**: ...

---

<!-- COPY TEMPLATE DI ATAS UNTUK TEST CASE BERIKUTNYA -->

## 📝 [ST_TC)016]

**Status**: 🔴 Failed

### 2. Katalon Script (Groovy)

```groovy
import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil

import internal.GlobalVariable as GlobalVariable

try {
    // Open browser and navigate to OTP verification page
    WebUI.openBrowser('')
    WebUI.navigateToUrl(GlobalVariable.base_url + '/otp')
    WebUI.maximizeWindow()

    // Step 1: Enter only three digits
    WebUI.waitForElementVisible(findTestObject('OtpVerification/otpInput1'), 30)
    WebUI.setText(findTestObject('OtpVerification/otpInput1'), '1')
    WebUI.setText(findTestObject('OtpVerification/otpInput2'), '2')
    WebUI.setText(findTestObject('OtpVerification/otpInput3'), '3')

    // Click Verify Email (first attempt)
    WebUI.waitForElementClickable(findTestObject('OtpVerification/btnVerifyEmail'), 20)
    WebUI.click(findTestObject('OtpVerification/btnVerifyEmail'))

    // Verify inline error for incomplete OTP
    WebUI.waitForElementVisible(findTestObject('OtpVerification/errIncompleteOtp'), 10)
    WebUI.verifyElementPresent(findTestObject('OtpVerification/errIncompleteOtp'), 10, FailureHandling.STOP_ON_FAILURE)

    // Step 3: Complete remaining three inputs with arbitrary digits
    WebUI.setText(findTestObject('OtpVerification/otpInput4'), '4')
    WebUI.setText(findTestObject('OtpVerification/otpInput5'), '5')
    WebUI.setText(findTestObject('OtpVerification/otpInput6'), '6')

    // Click Verify Email again (second attempt)
    WebUI.waitForElementClickable(findTestObject('OtpVerification/btnVerifyEmail'), 20)
    WebUI.click(findTestObject('OtpVerification/btnVerifyEmail'))

    // Verify server error message for invalid OTP
    WebUI.waitForElementVisible(findTestObject('OtpVerification/errInvalidOtp'), 10)
    WebUI.verifyElementPresent(findTestObject('OtpVerification/errInvalidOtp'), 10, FailureHandling.STOP_ON_FAILURE)
} catch (Exception e) {
    KeywordUtil.markFailed('Test case ST_TC_016 failed due to exception: ' + e.getMessage())
} finally {
    WebUI.closeBrowser()
}
```

### 3. Error Log / Console Output

```text
Fail Reason
com.kms.katalon.core.webui.exception.WebElementNotFoundException: Web element with id: 'Object Repository/OtpVerification/otpInput1' located by 'By.xpath: //*[@id='otpInput1']' not found

For trouble shooting, please visit: https://docs.katalon.com/katalon-studio/troubleshooting/troubleshoot-common-exceptions

```

### 4. Source Code Terkait (Optional)

```jsx
// Jika Anda merasa masalahnya ada di kodingan (seperti ID atau State), paste kodenya di sini
```

## 📝 [ST_TC_014]

**Status**: 🔴 Failed

### 2. Katalon Script (Groovy)

```groovy
import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil

import internal.GlobalVariable as GlobalVariable

try {
    // Open browser and navigate to registration / OTP flow page
    WebUI.openBrowser('')
    WebUI.navigateToUrl(GlobalVariable.base_url + '/otp-verification')
    WebUI.maximizeWindow()

    // Click the "Change" link to return to registration step
    WebUI.waitForElementClickable(findTestObject('otpVerification/linkChangeEmail'), 20)
    WebUI.click(findTestObject('otpVerification/linkChangeEmail'))

    // Verify registration form is displayed (email input visible)
    WebUI.waitForElementVisible(findTestObject('registrationPage/inputEmail'), 20)
    WebUI.verifyElementPresent(findTestObject('registrationPage/inputEmail'), 10)

    // Enter an email that will cause a duplicate insertion race condition
    String duplicateEmail = 'duplicate@example.com'
    WebUI.setText(findTestObject('registrationPage/inputEmail'), duplicateEmail)

    // First submission
    WebUI.waitForElementClickable(findTestObject('registrationPage/btnSubmit'), 20)
    WebUI.click(findTestObject('registrationPage/btnSubmit'))

    // Immediate second submission to simulate race condition
    WebUI.click(findTestObject('registrationPage/btnSubmit'))

    // Verify error message for duplicate email is displayed
    WebUI.waitForElementVisible(findTestObject('registrationPage/lblErrorEmailExists'), 20)
    WebUI.verifyElementPresent(findTestObject('registrationPage/lblErrorEmailExists'), 10)
    WebUI.verifyTextPresent('Email already exists', false)
} catch (Exception e) {
    KeywordUtil.markFailed('Test case ST_TC_014 failed due to exception: ' + e.getMessage())
} finally {
    WebUI.closeBrowser()
}
```

### 3. Error Log / Console Output

```text
Fail Reason
org.openqa.selenium.InvalidSelectorException: invalid selector: Unable to locate an element with the xpath expression //a[text()=&apos;Change&apos;] because of the following error:

At object: 'Object Repository/otpVerification/linkChangeEmail'

Test case ST_TC_014 failed due to exception: Unable to wait for object 'Object Repository/otpVerification/linkChangeEmail' to be clickable

```

### 4. Source Code Terkait (Optional)

```jsx
// Jika Anda merasa masalahnya ada di kodingan (seperti ID atau State), paste kodenya di sini
```

## 📝 [ST_TC_012]

**Status**: 🔴 Failed

### 2. Katalon Script (Groovy)

```groovy
import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import internal.GlobalVariable as GlobalVariable
import org.openqa.selenium.Keys as Keys

try {
    // Open browser and navigate to OTP verification page
    WebUI.openBrowser('')
    WebUI.navigateToUrl(GlobalVariable.base_url + '/otp-verification')
    WebUI.maximizeWindow()

    // Wait for the first OTP box to be visible
    WebUI.waitForElementVisible(findTestObject('otpVerification/otpBox1'), 30)

    // Step 1: Attempt to type non‑numeric characters into the first OTP box
    WebUI.sendKeys(findTestObject('otpVerification/otpBox1'), 'a!')
    // Verify that the value remains empty (non‑numeric characters ignored)
    String valAfterInvalid = WebUI.getAttribute(findTestObject('otpVerification/otpBox1'), 'value')
    WebUI.verifyEqual(valAfterInvalid, '', FailureHandling.STOP_ON_FAILURE)

    // Step 2: Enter digit '6' into first box, then digit '5' into second box
    WebUI.setText(findTestObject('otpVerification/otpBox1'), '6')
    WebUI.waitForElementVisible(findTestObject('otpVerification/otpBox2'), 10)
    WebUI.setText(findTestObject('otpVerification/otpBox2'), '5')

    // Verify that the first two boxes contain the expected digits
    String val1 = WebUI.getAttribute(findTestObject('otpVerification/otpBox1'), 'value')
    String val2 = WebUI.getAttribute(findTestObject('otpVerification/otpBox2'), 'value')
    WebUI.verifyEqual(val1, '6', FailureHandling.CONTINUE_ON_FAILURE)
    WebUI.verifyEqual(val2, '5', FailureHandling.CONTINUE_ON_FAILURE)

    // Step 3: Press Backspace while the third box is empty
    WebUI.click(findTestObject('otpVerification/otpBox3'))
    WebUI.sendKeys(findTestObject('otpVerification/otpBox3'), Keys.chord(Keys.BACK_SPACE))
    // Expect focus to shift back to the second box – verify that second box still holds '5'
    String val2AfterBackspace = WebUI.getAttribute(findTestObject('otpVerification/otpBox2'), 'value')
    WebUI.verifyEqual(val2AfterBackspace, '5', FailureHandling.CONTINUE_ON_FAILURE)

    // Step 4: Paste the string "654321" into the fourth OTP box
    // Simulate paste by setting the text directly; the UI is expected to distribute the digits
    WebUI.setText(findTestObject('otpVerification/otpBox4'), '654321')
    // Verify distribution across boxes 4,5,6 (and that 4 contains '6', 5 contains '5', 6 contains '4')
    String val4 = WebUI.getAttribute(findTestObject('otpVerification/otpBox4'), 'value')
    String val5 = WebUI.getAttribute(findTestObject('otpVerification/otpBox5'), 'value')
    String val6 = WebUI.getAttribute(findTestObject('otpVerification/otpBox6'), 'value')
    WebUI.verifyEqual(val4, '6', FailureHandling.CONTINUE_ON_FAILURE)
    WebUI.verifyEqual(val5, '5', FailureHandling.CONTINUE_ON_FAILURE)
    WebUI.verifyEqual(val6, '4', FailureHandling.CONTINUE_ON_FAILURE)

    // Step 5: Click "Verify Email"
    WebUI.waitForElementClickable(findTestObject('otpVerification/verifyEmailButton'), 20)
    WebUI.click(findTestObject('otpVerification/verifyEmailButton'))

    // Simple assertion that the verification button is no longer visible (indicates navigation)
    WebUI.verifyElementNotPresent(findTestObject('otpVerification/verifyEmailButton'), 10, FailureHandling.CONTINUE_ON_FAILURE)
} catch (Exception e) {
    KeywordUtil.markFailedAndStop('Test case ST_TC_012 failed due to exception: ' + e.getMessage())
} finally {
    WebUI.closeBrowser()
}
```

### 3. Error Log / Console Output

```text
Fail Reason
org.openqa.selenium.InvalidSelectorException: invalid selector: Unable to locate an element with the xpath expression (//div[contains(text(),&apos;6-digit code&apos;)]/following::input)[1] because of the following error:

At object: 'Object Repository/otpVerification/otpBox1'
```

### 4. Source Code Terkait (Optional)

```jsx
// Jika Anda merasa masalahnya ada di kodingan (seperti ID atau State), paste kodenya di sini
```

## 📝 [ST_TC_013]

**Status**: 🔴 Failed

### 2. Katalon Script (Groovy)

```groovy
import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil

import internal.GlobalVariable as GlobalVariable

try {
    // Open browser and navigate to OTP verification page
    WebUI.openBrowser('')
    WebUI.navigateToUrl(GlobalVariable.base_url + '/otp-verification')
    WebUI.maximizeWindow()

    // Wait for countdown timer to be visible
    WebUI.waitForElementVisible(findTestObject('otpVerification/timerRemaining'), 30)
    // Wait until timer reaches 0 (display shows "00")
    boolean timerZero = false
    int attempts = 0
    while (!timerZero && attempts < 60) { // safety max 60 checks (~1 min)
        String timerText = WebUI.getText(findTestObject('otpVerification/timerRemaining'))
        if (timerText.contains('00')) {
            timerZero = true
            break
        }
        WebUI.delay(1)
        attempts++
    }
    if (!timerZero) {
        KeywordUtil.markFailedAndStop('Timer did not reach zero within expected time.')
    }

    // Verify Resend button becomes clickable and click it
    WebUI.waitForElementClickable(findTestObject('otpVerification/btnResend'), 20)
    WebUI.click(findTestObject('otpVerification/btnResend'))

    // Verify timer resets to 45 seconds
    WebUI.waitForElementVisible(findTestObject('otpVerification/timerRemaining'), 20)
    WebUI.verifyTextPresent('45', false)

    // ----- STEP 3: Attempt verification with original OTP (simulated as 123456) -----
    String originalOtp = '123456' // placeholder representing captured OTP before expiry
    WebUI.waitForElementVisible(findTestObject('otpVerification/inputOtp'), 20)
    WebUI.setText(findTestObject('otpVerification/inputOtp'), originalOtp)
    WebUI.waitForElementClickable(findTestObject('otpVerification/btnVerifyEmail'), 20)
    WebUI.click(findTestObject('otpVerification/btnVerifyEmail'))

    // Expect error indicating invalid/expired OTP
    WebUI.verifyTextPresent('Invalid or expired OTP', false)

    // ----- STEP 4: Verify with newly generated OTP (simulated as 654321) -----
    String newOtp = '654321' // placeholder for new OTP printed to console after resend
    WebUI.clearText(findTestObject('otpVerification/inputOtp'))
    WebUI.setText(findTestObject('otpVerification/inputOtp'), newOtp)
    WebUI.click(findTestObject('otpVerification/btnVerifyEmail'))

    // Verify successful verification – timer should be hidden or success message appears
    // Assuming a success element with text "Email verified" appears
    WebUI.waitForElementVisible(findTestObject('otpVerification/timerRemaining'), 10, FailureHandling.OPTIONAL)
    WebUI.verifyElementNotPresent(findTestObject('otpVerification/timerRemaining'), 5)
    WebUI.verifyTextPresent('Email verified', false)
} catch (Exception e) {
    KeywordUtil.markFailed('Test case ST_TC_013 failed due to exception: ' + e.getMessage())
} finally {
    WebUI.closeBrowser()
}
```

### 3. Error Log / Console Output

```text
Fail Reason
org.openqa.selenium.InvalidSelectorException: invalid selector: Unable to locate an element with the xpath expression //div[contains(text(),&apos;remaining&apos;)] because of the following error:

At object: 'Object Repository/otpVerification/timerRemaining'
```

### 4. Source Code Terkait (Optional)

```jsx
// Jika Anda merasa masalahnya ada di kodingan (seperti ID atau State), paste kodenya di sini
```

## 📝 [ST_TC_010]

**Status**: 🔴 Failed

### 2. Katalon Script (Groovy)

```groovy
import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import internal.GlobalVariable as GlobalVariable

try {
    // Open browser and navigate to registration page
    WebUI.openBrowser('')
    WebUI.navigateToUrl(GlobalVariable.base_url + '/register')
    WebUI.maximizeWindow()

    // Fill registration form with existing email
    WebUI.waitForElementVisible(findTestObject('register/nameInput'), 30)
    WebUI.setText(findTestObject('register/nameInput'), 'Existing User')

    WebUI.waitForElementVisible(findTestObject('register/emailInput'), 30)
    WebUI.setText(findTestObject('register/emailInput'), 'existing.user@example.com')

    WebUI.waitForElementVisible(findTestObject('register/passwordInput'), 30)
    WebUI.setText(findTestObject('register/passwordInput'), 'Test@1234') // using encrypted text placeholder

    WebUI.waitForElementClickable(findTestObject('register/agreeTermsCheckbox'), 30)
    WebUI.click(findTestObject('register/agreeTermsCheckbox'))

    // Submit registration
    WebUI.waitForElementClickable(findTestObject('register/registerButton'), 30)
    WebUI.click(findTestObject('register/registerButton'))

    // Verify inline error for duplicate email
    WebUI.waitForElementVisible(findTestObject('register/registerErrorMessage'), 10)
    WebUI.verifyElementPresent(findTestObject('register/registerErrorMessage'), 10)
    WebUI.verifyMatch(WebUI.getText(findTestObject('register/registerErrorMessage')), 'Email already exists', false)

    // Ensure we are still on registration step (OTP UI should not be present)
    boolean isOtpVisible = WebUI.waitForElementVisible(findTestObject('otpVerification/otpInput1'), 5, FailureHandling.OPTIONAL)
    if (isOtpVisible) {
        KeywordUtil.markFailed('OTP input became visible unexpectedly.')
    }

    // Directly navigate to OTP verification page with same email
    WebUI.navigateToUrl(GlobalVariable.base_url + '/verify-otp?email=existing.user@example.com')

    // Verify OTP page elements
    WebUI.waitForElementVisible(findTestObject('otpVerification/otpInput1'), 30)
    WebUI.verifyElementPresent(findTestObject('otpVerification/verifyTimer'), 10)

    // Enter six digits (111111)
    WebUI.setText(findTestObject('otpVerification/otpInput1'), '1')
    WebUI.setText(findTestObject('otpVerification/otpInput2'), '1')
    WebUI.setText(findTestObject('otpVerification/otpInput3'), '1')
    WebUI.setText(findTestObject('otpVerification/otpInput4'), '1')
    WebUI.setText(findTestObject('otpVerification/otpInput5'), '1')
    WebUI.setText(findTestObject('otpVerification/otpInput6'), '1')

    // Click Verify Email
    WebUI.waitForElementClickable(findTestObject('otpVerification/verifyOtpButton'), 30)
    WebUI.click(findTestObject('otpVerification/verifyOtpButton'))

    // Verify OTP error message
    WebUI.waitForElementVisible(findTestObject('otpVerification/verifyOtpErrorMessage'), 10)
    WebUI.verifyElementPresent(findTestObject('otpVerification/verifyOtpErrorMessage'), 10)
    WebUI.verifyMatch(WebUI.getText(findTestObject('otpVerification/verifyOtpErrorMessage')), 'Invalid or expired OTP', false)
} catch (Exception e) {
    KeywordUtil.markFailedAndStop('Test case ST_TC_010 failed with exception: ' + e.getMessage())
} finally {
    WebUI.closeBrowser()
}
```

### 3. Error Log / Console Output

```text
Fail Reason
com.kms.katalon.core.exception.StepFailedException: com.kms.katalon.core.webui.exception.WebElementNotFoundException: Web element with id: 'Object Repository/register/registerErrorMessage' located by 'By.xpath: //*[@id='registerErrorMsg']' not found
```

### 4. Source Code Terkait (Optional)

```jsx
// Jika Anda merasa masalahnya ada di kodingan (seperti ID atau State), paste kodenya di sini
```

## 📝 [ST_TC_008]

**Status**: 🔴 Failed

### 2. Katalon Script (Groovy)

```groovy
import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil

import internal.GlobalVariable as GlobalVariable
import java.awt.datatransfer.StringSelection
import java.awt.Toolkit
import java.awt.datatransfer.Clipboard
import org.openqa.selenium.Keys

try {
    // Navigate directly to OTP verification page (assumes prior registration step completed)
    WebUI.openBrowser('')
    WebUI.navigateToUrl(GlobalVariable.base_url + '/verify-otp')
    WebUI.maximizeWindow()

    // Copy OTP "112233" to system clipboard
    String otp = '112233'
    StringSelection selection = new StringSelection(otp)
    Clipboard clipboard = Toolkit.getDefaultToolkit().getSystemClipboard()
    clipboard.setContents(selection, null)

    // Focus first OTP input and paste
    WebUI.waitForElementVisible(findTestObject('OtpVerificationPage/otpInput1'), 30)
    WebUI.click(findTestObject('OtpVerificationPage/otpInput1'))
    WebUI.sendKeys(findTestObject('OtpVerificationPage/otpInput1'), Keys.chord(Keys.CONTROL, 'v'))

    // Verify each box contains correct digit
    WebUI.verifyElementAttributeValue(findTestObject('OtpVerificationPage/otpInput1'), 'value', '1', 10)
    WebUI.verifyElementAttributeValue(findTestObject('OtpVerificationPage/otpInput2'), 'value', '1', 10)
    WebUI.verifyElementAttributeValue(findTestObject('OtpVerificationPage/otpInput3'), 'value', '2', 10)
    WebUI.verifyElementAttributeValue(findTestObject('OtpVerificationPage/otpInput4'), 'value', '2', 10)
    WebUI.verifyElementAttributeValue(findTestObject('OtpVerificationPage/otpInput5'), 'value', '3', 10)
    WebUI.verifyElementAttributeValue(findTestObject('OtpVerificationPage/otpInput6'), 'value', '3', 10)

    // Click Verify Email button
    WebUI.waitForElementClickable(findTestObject('OtpVerificationPage/verifyOtpBtn'), 30)
    WebUI.click(findTestObject('OtpVerificationPage/verifyOtpBtn'))

    // Verify success – the success message appears on step 3
    WebUI.waitForElementVisible(findTestObject('RegisterSuccessPage/registrationSuccessMsg'), 30)
    WebUI.verifyElementPresent(findTestObject('RegisterSuccessPage/registrationSuccessMsg'), 10)
} catch (Exception e) {
    KeywordUtil.markFailed('ST_TC_008 failed: ' + e.getMessage())
} finally {
    WebUI.closeBrowser()
}
```

### 3. Error Log / Console Output

```text
Fail Reason
com.kms.katalon.core.webui.exception.WebElementNotFoundException: Web element with id: 'Object Repository/OtpVerificationPage/otpInput1' located by 'By.xpath: //*[@id='otpInput1']' not found

```

### 4. Source Code Terkait (Optional)

```jsx
// Jika Anda merasa masalahnya ada di kodingan (seperti ID atau State), paste kodenya di sini
```

## 📝 [ST_TC_007]

**Status**: 🔴 Failed

### 2. Katalon Script (Groovy)

```groovy
import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil

import internal.GlobalVariable as GlobalVariable

try {
    WebUI.openBrowser('')
    WebUI.navigateToUrl(GlobalVariable.base_url + '/register')
    WebUI.maximizeWindow()

    // Register with valid data to reach OTP step
    WebUI.waitForElementVisible(findTestObject('Register/nameInput'), 30)
    WebUI.setText(findTestObject('Register/nameInput'), 'Charlie')
    WebUI.setText(findTestObject('Register/emailInput'), 'charlie@example.com')
    WebUI.setText(findTestObject('Register/passwordInput'), 'Pass!23')
    WebUI.check(findTestObject('Register/agreeTermsCheckbox'))
    WebUI.click(findTestObject('Register/registerBtn'))

    // Wait for OTP verification screen
    WebUI.waitForElementVisible(findTestObject('OtpVerification/verifyOtpBtn'), 20)

    // Verify timer is > 0
    WebUI.waitForElementVisible(findTestObject('OtpVerification/verifyTimer'), 10)
    String timerText = WebUI.getText(findTestObject('OtpVerification/verifyTimer'))
    assert timerText.contains('remaining') : 'Timer not displayed'

    // Verify Resend button style attributes while timer > 0
    WebUI.waitForElementVisible(findTestObject('OtpVerification/resendBtn'), 10)
    String opacity = WebUI.getAttribute(findTestObject('OtpVerification/resendBtn'), 'style')
    // style includes opacity and cursor; check for opacity:0.6 and cursor:not-allowed
    assert opacity.contains('opacity: 0.6') : 'Resend button opacity not 0.6 when timer active'
    assert opacity.contains('cursor: not-allowed') : 'Resend button cursor not not-allowed when timer active'

    // Attempt to click the disabled Resend button (should have no effect)
    WebUI.click(findTestObject('OtpVerification/resendBtn'))
    // Capture timer after click to ensure it hasn't reset
    String timerAfter = WebUI.getText(findTestObject('OtpVerification/verifyTimer'))
    assert timerAfter == timerText : 'Timer changed after clicking disabled Resend button'

} catch (Exception e) {
    KeywordUtil.markFailedAndStop('Test case ST_TC_007 failed: ' + e.getMessage())
} finally {
    WebUI.closeBrowser()
}
```

### 3. Error Log / Console Output

```text
Fail Reason
For trouble shooting, please visit: https://docs.katalon.com/katalon-studio/troubleshooting/troubleshoot-common-exceptions
Test Cases/ST_TC_007 FAILED.
Reason:
java.lang.AssertionError: Timer changed after clicking disabled Resend button. Expression: (timerAfter == timerText). Values: timerAfter = 0:43 remaining, timerText = 0:44 remaining
	at ST_TC_007.run(ST_TC_007.groovy:53)
```

### 4. Source Code Terkait (Optional)

```jsx
// Jika Anda merasa masalahnya ada di kodingan (seperti ID atau State), paste kodenya di sini
```

## 📝 [ST_TC_005]

**Status**: 🔴 Failed

### 2. Katalon Script (Groovy)

```groovy
import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil

import internal.GlobalVariable as GlobalVariable

try {
    WebUI.openBrowser('')
    WebUI.navigateToUrl(GlobalVariable.base_url + '/register')
    WebUI.maximizeWindow()

    // Fill registration with a fresh email to trigger OTP step
    WebUI.waitForElementVisible(findTestObject('register/nameInput'), 30)
    WebUI.setText(findTestObject('register/nameInput'), 'Bob')
    WebUI.setText(findTestObject('register/emailInput'), 'bob.unique@example.com')
    WebUI.setText(findTestObject('register/passwordInput'), 'Secret123')
    WebUI.click(findTestObject('register/agreeTermsCheckbox'))
    WebUI.click(findTestObject('register/registerButton'))

    // Wait for OTP verification UI
    WebUI.waitForElementVisible(findTestObject('otpVerification/otpInput1'), 20)

    // Enter incorrect OTP digits
    WebUI.setText(findTestObject('otpVerification/otpInput1'), '6')
    WebUI.setText(findTestObject('otpVerification/otpInput2'), '5')
    WebUI.setText(findTestObject('otpVerification/otpInput3'), '4')
    WebUI.setText(findTestObject('otpVerification/otpInput4'), '3')
    WebUI.setText(findTestObject('otpVerification/otpInput5'), '2')
    WebUI.setText(findTestObject('otpVerification/otpInput6'), '1')

    // Click Verify
    WebUI.waitForElementClickable(findTestObject('otpVerification/verifyOtpButton'), 10)
    WebUI.click(findTestObject('otpVerification/verifyOtpButton'))

    // Verify error message
    WebUI.waitForElementVisible(findTestObject('otpVerification/verifyOtpErrorMsg'), 10)
    WebUI.verifyElementPresent(findTestObject('otpVerification/verifyOtpErrorMsg'), 10)
    WebUI.verifyMatch(WebUI.getText(findTestObject('otpVerification/verifyOtpErrorMsg')).trim(), 'Invalid or expired OTP', false)
} catch (Exception e) {
    KeywordUtil.markFailed('Exception: ' + e.getMessage())
} finally {
    WebUI.closeBrowser()
}
```

### 3. Error Log / Console Output

```text
Fail Reason
com.kms.katalon.core.exception.StepFailedException: com.kms.katalon.core.webui.exception.WebElementNotFoundException: Web element with id: 'Object Repository/otpVerification/verifyOtpErrorMsg' located by 'By.xpath: //*[@id='verifyOtpErrorMsg']' not found

```

### 4. Source Code Terkait (Optional)

```jsx
// Jika Anda merasa masalahnya ada di kodingan (seperti ID atau State), paste kodenya di sini
```

## 📝 [ST_TC_004]

**Status**: 🔴 Failed

### 2. Katalon Script (Groovy)

```groovy
import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import internal.GlobalVariable as GlobalVariable
import org.openqa.selenium.Keys as Keys

try {
    // Open browser and navigate to OTP verification page (assumed direct URL)
    WebUI.openBrowser('')
    WebUI.navigateToUrl(GlobalVariable.base_url + '/verify-otp')
    WebUI.maximizeWindow()

    // Wait for OTP inputs to be visible
    WebUI.waitForElementVisible(findTestObject('OtpVerificationPage/otpInput1'), 30)

    // Enter four digits (1 2 3 4) leaving last two empty
    WebUI.setText(findTestObject('OtpVerificationPage/otpInput1'), '1')
    WebUI.setText(findTestObject('OtpVerificationPage/otpInput2'), '2')
    WebUI.setText(findTestObject('OtpVerificationPage/otpInput3'), '3')
    WebUI.setText(findTestObject('OtpVerificationPage/otpInput4'), '4')
    // Ensure remaining inputs are empty (optional)
    WebUI.clearText(findTestObject('OtpVerificationPage/otpInput5'))
    WebUI.clearText(findTestObject('OtpVerificationPage/otpInput6'))

    // Click Verify Email button
    WebUI.waitForElementClickable(findTestObject('OtpVerificationPage/verifyOtpBtn'), 20)
    WebUI.click(findTestObject('OtpVerificationPage/verifyOtpBtn'))

    // Verify inline error message appears
    WebUI.waitForElementVisible(findTestObject('OtpVerificationPage/verifyOtpErrorMsg'), 10)
    WebUI.verifyElementPresent(findTestObject('OtpVerificationPage/verifyOtpErrorMsg'), 5)
    String errorMsg = WebUI.getText(findTestObject('OtpVerificationPage/verifyOtpErrorMsg'))
    WebUI.verifyMatch(errorMsg, 'Please enter the 6-digit code', false)
} catch (Exception e) {
    KeywordUtil.markFailedAndStop('Test ST_TC_004 failed with exception: ' + e.getMessage())
} finally {
    WebUI.closeBrowser()
}
```

### 3. Error Log / Console Output

```text
Fail Reason
com.kms.katalon.core.webui.exception.WebElementNotFoundException: Web element with id: 'Object Repository/OtpVerificationPage/otpInput1' located by 'By.xpath: //*[@id='otpInput1']' not found
```

### 4. Source Code Terkait (Optional)

```jsx
// Jika Anda merasa masalahnya ada di kodingan (seperti ID atau State), paste kodenya di sini
```

## 📝 [ST_TC_002]

**Status**: 🔴 Failed

### 2. Katalon Script (Groovy)

```groovy
import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil

import internal.GlobalVariable as GlobalVariable

try {
    WebUI.openBrowser('')
    WebUI.navigateToUrl(GlobalVariable.base_url + '/register')
    WebUI.maximizeWindow()

    // Wait for registration form elements
    WebUI.waitForElementVisible(findTestObject('register/nameInput'), 30)
    WebUI.setText(findTestObject('register/nameInput'), 'Alice')

    WebUI.waitForElementVisible(findTestObject('register/emailInput'), 30)
    WebUI.setText(findTestObject('register/emailInput'), 'duplicate@example.com')

    WebUI.waitForElementVisible(findTestObject('register/passwordInput'), 30)
    WebUI.setText(findTestObject('register/passwordInput'), 'Secret123') // using plain for simplicity
    // Check the Terms & Conditions checkbox
    WebUI.waitForElementClickable(findTestObject('register/agreeTermsCheckbox'), 30)
    WebUI.click(findTestObject('register/agreeTermsCheckbox'))

    // Click Register
    WebUI.waitForElementClickable(findTestObject('register/registerButton'), 30)
    WebUI.click(findTestObject('register/registerButton'))

    // Verify inline error message appears
    WebUI.waitForElementVisible(findTestObject('register/registerErrorMsg'), 10)
    WebUI.verifyElementPresent(findTestObject('register/registerErrorMsg'), 10)
    WebUI.verifyMatch(WebUI.getText(findTestObject('register/registerErrorMsg')).trim(), 'Email already exists', false)

    // Ensure OTP UI does NOT appear
    WebUI.verifyElementNotPresent(findTestObject('register/registerStep2Card'), 5)
} catch (Exception e) {
    KeywordUtil.markFailed('Test failed due to exception: ' + e.getMessage())
} finally {
    WebUI.closeBrowser()
}
```

### 3. Error Log / Console Output

```text
Fail Reason
com.kms.katalon.core.exception.StepFailedException: com.kms.katalon.core.webui.exception.WebElementNotFoundException: Web element with id: 'Object Repository/register/registerErrorMsg' located by 'By.xpath: //*[@id='registerErrorMsg']' not found

```

### 4. Source Code Terkait (Optional)

```jsx
// Jika Anda merasa masalahnya ada di kodingan (seperti ID atau State), paste kodenya di sini
```
