package uk.mercury_lab.household_budget.collector;

import android.content.Context;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class ApiClient {
    interface Callback { void complete(boolean success, String message); }
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    private ApiClient() {}

    static void send(
        Context context,
        String packageName,
        String appName,
        String title,
        String text,
        long postedAt,
        String notificationKey,
        Callback callback
    ) {
        String token = CollectorPreferences.token(context);
        if (token.isEmpty()) {
            if (callback != null) callback.complete(false, "기기 토큰이 없습니다.");
            return;
        }
        EXECUTOR.execute(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(CollectorPreferences.apiUrl(context) + "/api/notification-imports/events");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(10_000);
                connection.setReadTimeout(10_000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.setRequestProperty("Authorization", "Bearer " + token);
                String json = "{" +
                    "\"packageName\":\"" + escape(packageName) + "\"," +
                    "\"appName\":\"" + escape(appName) + "\"," +
                    "\"title\":\"" + escape(title) + "\"," +
                    "\"text\":\"" + escape(text) + "\"," +
                    "\"postedAt\":\"" + Instant.ofEpochMilli(postedAt) + "\"," +
                    "\"notificationKey\":\"" + escape(notificationKey) + "\"}";
                byte[] body = json.getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(body.length);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(body);
                }
                int status = connection.getResponseCode();
                boolean success = status >= 200 && status < 300;
                if (callback != null) callback.complete(success, success ? "전송했습니다." : "서버 응답 " + status);
            } catch (Exception error) {
                if (callback != null) callback.complete(false, error.getMessage() == null ? "전송 실패" : error.getMessage());
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private static String escape(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
    }
}
