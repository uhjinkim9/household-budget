package uk.mercury_lab.household_budget.collector;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.provider.Settings;
import android.text.InputType;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private EditText apiUrl;
    private EditText token;
    private CheckBox enabled;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(buildContent());
    }

    private View buildContent() {
        int padding = dp(22);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(padding, padding, padding, padding);

        TextView heading = text("Android 거래 자동등록", 24, true);
        TextView description = text("카드사 앱의 결제 알림 후보만 암호화된 연결을 통해 가계부 대기함으로 전송합니다.", 14, false);
        description.setTextColor(Color.DKGRAY);
        content.addView(heading);
        content.addView(description, margin(0, 8, 0, 24));

        content.addView(text("가계부 주소", 13, true));
        apiUrl = new EditText(this);
        apiUrl.setSingleLine(true);
        apiUrl.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        apiUrl.setText(CollectorPreferences.apiUrl(this));
        content.addView(apiUrl, margin(0, 4, 0, 14));

        content.addView(text("기기 연결 토큰", 13, true));
        token = new EditText(this);
        token.setSingleLine(false);
        token.setMinLines(2);
        token.setText(CollectorPreferences.token(this));
        content.addView(token, margin(0, 4, 0, 14));

        enabled = new CheckBox(this);
        enabled.setText("결제 알림 후보 전송 사용");
        enabled.setChecked(CollectorPreferences.enabled(this));
        content.addView(enabled);

        Button save = button("설정 저장");
        save.setOnClickListener(view -> save());
        content.addView(save, margin(0, 10, 0, 8));

        Button permission = button("알림 접근 권한 열기");
        permission.setOnClickListener(view -> startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        content.addView(permission, margin(0, 0, 0, 8));

        Button test = button("테스트 결제 알림 보내기");
        test.setOnClickListener(view -> sendTest());
        content.addView(test);

        TextView privacy = text("이 앱은 ‘원’ 금액과 승인·결제·취소·출금·입금 키워드가 함께 있는 알림만 전송합니다. 실제 거래 등록은 웹 대기함에서 직접 확인해야 합니다.", 12, false);
        privacy.setTextColor(Color.GRAY);
        content.addView(privacy, margin(0, 22, 0, 0));

        ScrollView scroll = new ScrollView(this);
        scroll.addView(content);
        return scroll;
    }

    private boolean save() {
        String url = apiUrl.getText().toString().trim();
        String value = token.getText().toString().trim();
        if (!url.startsWith("https://")) {
            Toast.makeText(this, "HTTPS 가계부 주소를 입력해주세요.", Toast.LENGTH_LONG).show();
            return false;
        }
        if (enabled.isChecked() && !value.startsWith("hb_android_")) {
            Toast.makeText(this, "웹에서 발급한 기기 토큰을 입력해주세요.", Toast.LENGTH_LONG).show();
            return false;
        }
        CollectorPreferences.save(this, url, value, enabled.isChecked());
        Toast.makeText(this, "저장했습니다.", Toast.LENGTH_SHORT).show();
        return true;
    }

    private void sendTest() {
        if (!save()) return;
        ApiClient.send(this, getPackageName(), "어진 가계부 테스트", "카드 승인", "11/23 12:30 테스트카페 1,500원 승인", System.currentTimeMillis(), "test-" + System.currentTimeMillis(), (success, message) -> runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_LONG).show()));
    }

    private TextView text(String value, int size, boolean bold) {
        TextView text = new TextView(this);
        text.setText(value);
        text.setTextSize(size);
        if (bold) text.setTypeface(null, android.graphics.Typeface.BOLD);
        return text;
    }

    private Button button(String value) {
        Button button = new Button(this);
        button.setText(value);
        button.setAllCaps(false);
        return button;
    }

    private LinearLayout.LayoutParams margin(int left, int top, int right, int bottom) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.setMargins(dp(left), dp(top), dp(right), dp(bottom));
        return params;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
