package uk.mercury_lab.household_budget.collector;

import android.content.Context;
import android.content.SharedPreferences;

final class CollectorPreferences {
    private static final String FILE = "collector";
    private static final String DEFAULT_API = "https://household-budget.mercury-lab.uk";

    private CollectorPreferences() {}

    static SharedPreferences store(Context context) {
        return context.getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }

    static String apiUrl(Context context) {
        return store(context).getString("api_url", DEFAULT_API).replaceAll("/+$", "");
    }

    static String token(Context context) {
        return store(context).getString("device_token", "");
    }

    static boolean enabled(Context context) {
        return store(context).getBoolean("enabled", false);
    }

    static void save(Context context, String apiUrl, String token, boolean enabled) {
        store(context).edit()
            .putString("api_url", apiUrl.trim().replaceAll("/+$", ""))
            .putString("device_token", token.trim())
            .putBoolean("enabled", enabled)
            .apply();
    }
}
