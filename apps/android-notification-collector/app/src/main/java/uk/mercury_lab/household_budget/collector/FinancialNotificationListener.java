package uk.mercury_lab.household_budget.collector;

import android.app.Notification;
import android.content.pm.ApplicationInfo;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.text.TextUtils;
import java.util.regex.Pattern;

public final class FinancialNotificationListener extends NotificationListenerService {
    private static final Pattern AMOUNT = Pattern.compile("[+-]?[0-9,]+\\s*원");
    private static final Pattern FINANCIAL_ACTION = Pattern.compile("승인|결제|이용|취소|출금|입금");

    @Override
    public void onNotificationPosted(StatusBarNotification notification) {
        if (!CollectorPreferences.enabled(this)) return;
        if (notification.getPackageName().equals(getPackageName())) return;
        Notification raw = notification.getNotification();
        CharSequence titleValue = raw.extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence bigTextValue = raw.extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        CharSequence textValue = bigTextValue != null
            ? bigTextValue
            : raw.extras.getCharSequence(Notification.EXTRA_TEXT);
        String title = titleValue == null ? "" : titleValue.toString();
        String text = textValue == null ? "" : textValue.toString();
        String combined = title + "\n" + text;
        if (TextUtils.isEmpty(text) || !AMOUNT.matcher(combined).find() || !FINANCIAL_ACTION.matcher(combined).find())
            return;
        ApiClient.send(
            getApplicationContext(),
            notification.getPackageName(),
            appName(notification.getPackageName()),
            title,
            text,
            notification.getPostTime(),
            notification.getKey(),
            null
        );
    }

    private String appName(String packageName) {
        try {
            ApplicationInfo info = getPackageManager().getApplicationInfo(packageName, 0);
            return getPackageManager().getApplicationLabel(info).toString();
        } catch (Exception ignored) {
            return packageName;
        }
    }
}
