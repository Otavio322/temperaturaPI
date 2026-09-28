
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>


const char* WIFI_SSID = "NOME_DA_SUA_REDE";
const char* WIFI_PASS = "SENHA_DA_REDE";

const char* API_URL   = "https://SEU-APP.onrender.com/api/device/readings";

const char* API_KEY   = "COLE_AQUI_A_CHAVE_DO_DISPOSITIVO";

const int PIN_DHT = 4;
const int PIN_LED_OK = 26;
const int PIN_LED_ALERTA = 27;
const int PIN_BUZZER = 25;

const unsigned long SEND_EVERY_MS = 10000;  
const unsigned long PAGE_EVERY_MS = 4000;   

DHT dht(PIN_DHT, DHT22);
LiquidCrystal_I2C lcd(0x27, 16, 2);  
float lastT = NAN, lastH = NAN;
String status = "aguardando";  
String fruitName = "";
String issuesShort = "";       
bool hasIdeal = false;
float tMin = 0, tMax = 0, hMin = 0, hMax = 0;

bool firstRun = true;
bool showIdealPage = false;
unsigned long lastSend = 0, lastPage = 0;

// O display não tem acentos: converte "Mamão" -> "Mamao"
String asciiFold(const String& s) {
  static const char accents[] = {(char)0xA1, (char)0xA0, (char)0xA2, (char)0xA3, (char)0xA7, (char)0xA9,
                                 (char)0xAA, (char)0xAD, (char)0xB3, (char)0xB4, (char)0xB5, (char)0xBA};
  static const char plain[] = "aaaaceeiooou";
  String out;
  for (size_t i = 0; i < s.length(); i++) {
    uint8_t c = (uint8_t)s[i];
    if (c == 0xC3 && i + 1 < s.length()) {
      uint8_t d = (uint8_t)s[++i];
      bool upper = (d >= 0x80 && d <= 0x9F);
      if (upper) d += 0x20;
      char r = '?';
      for (int k = 0; k < 12; k++) if ((uint8_t)accents[k] == d) r = plain[k];
      out += upper ? (char)toupper(r) : r;
    } else if (c < 0x80) {
      out += (char)c;
    }
  }
  return out;
}

void printLine(int row, String text) {
  if (text.length() > 16) text = text.substring(0, 16);
  while (text.length() < 16) text += ' ';
  lcd.setCursor(0, row);
  lcd.print(text);
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  printLine(0, "Conectando WiFi");
  printLine(1, "");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) delay(300);
  printLine(0, WiFi.status() == WL_CONNECTED ? "WiFi conectado" : "WiFi falhou");
  delay(800);
}

void beepAlert() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_BUZZER, HIGH); delay(120);
    digitalWrite(PIN_BUZZER, LOW);  delay(120);
  }
}

void applyIndicators() {
  static String previous = "";
  bool ok = (status == "ok");
  bool alerta = (status == "alerta");
  digitalWrite(PIN_LED_OK, ok ? HIGH : LOW);
  digitalWrite(PIN_LED_ALERTA, (alerta || status == "erro_sensor") ? HIGH : LOW);
  if (alerta && previous != "alerta") beepAlert();  // apita só quando ENTRA em alerta
  previous = status;
}

void showPage() {
  if (status == "erro_sensor") { printLine(0, "Erro no sensor"); printLine(1, "Confira o DHT22"); return; }
  if (isnan(lastT)) { printLine(0, "Aguardando..."); printLine(1, ""); return; }

  if (showIdealPage && hasIdeal) {
    char l0[20], l1[20];
    snprintf(l0, sizeof(l0), "Ideal T:%.0f-%.0fC", tMin, tMax);
    snprintf(l1, sizeof(l1), "Ideal U:%.0f-%.0f%%", hMin, hMax);
    printLine(0, l0);
    printLine(1, l1);
    return;
  }

  char l0[20];
  snprintf(l0, sizeof(l0), "T:%.1fC U:%.0f%%", lastT, lastH);
  printLine(0, l0);

  String fruit = fruitName.length() ? fruitName.substring(0, 8) : String("Sem fruta");
  String line1;
  if (status == "ok") line1 = fruit + " OK";
  else if (status == "alerta") line1 = fruit + " !" + issuesShort;
  else if (status == "sem_api") line1 = "Sem servidor";
  else line1 = fruit;
  printLine(1, line1);
}


bool sendReading(float t, float h) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(8000);
  if (!http.begin(client, API_URL)) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);

  JsonDocument req;
  req["temperature"] = roundf(t * 10) / 10.0f;
  req["humidity"] = roundf(h * 10) / 10.0f;
  String body;
  serializeJson(req, body);

  int code = http.POST(body);
  if (code != 201) {
    Serial.printf("Falha no envio, HTTP %d\n", code);
    http.end();
    return false;
  }

  JsonDocument resp;
  DeserializationError err = deserializeJson(resp, http.getString());
  http.end();
  if (err) return false;

  status = String(resp["status"] | "aguardando");
  fruitName = asciiFold(String(resp["fruit"] | ""));

  JsonObject ideal = resp["ideal"];
  hasIdeal = !ideal.isNull();
  if (hasIdeal) {
    tMin = ideal["tempMin"]; tMax = ideal["tempMax"];
    hMin = ideal["humMin"];  hMax = ideal["humMax"];
  }

  issuesShort = "";
  for (JsonVariant v : resp["issues"].as<JsonArray>()) {
    String s = v.as<String>();
    if (s == "temperatura_alta") issuesShort += "T+";
    else if (s == "temperatura_baixa") issuesShort += "T-";
    else if (s == "umidade_alta") issuesShort += "U+";
    else if (s == "umidade_baixa") issuesShort += "U-";
  }
  return true;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_OK, OUTPUT);
  pinMode(PIN_LED_ALERTA, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  dht.begin();
  lcd.init();
  lcd.backlight();
  printLine(0, "Ponto Certo");
  printLine(1, "Iniciando...");
  delay(2000);  
  connectWifi();
}

void loop() {
  unsigned long now = millis();
  connectWifi();

  if (firstRun || now - lastSend >= SEND_EVERY_MS) {
    firstRun = false;
    lastSend = now;

    float h = dht.readHumidity();
    float t = dht.readTemperature();
    if (isnan(t) || isnan(h)) {
      status = "erro_sensor";
    } else {
      lastT = t;
      lastH = h;
      if (!sendReading(t, h)) status = "sem_api";
    }
    applyIndicators();
    showPage();
  }

  if (now - lastPage >= PAGE_EVERY_MS) {
    lastPage = now;
    showIdealPage = !showIdealPage;
    showPage();
  }
}
