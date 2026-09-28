#include <WiFi.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "ThingSpeak.h"


const char* WIFI_SSID = "";
const char* WIFI_PASS = "";


unsigned long CHANNEL_ID = 0;                 
const char* WRITE_API_KEY = "";


const int PIN_DHT = 4;
const int PIN_LED_OK = 26;
const int PIN_LED_ALERTA = 27;   
const int PIN_BUZZER = 25;


const unsigned long SEND_EVERY_MS = 20000;

DHT dht(PIN_DHT, DHT22);
LiquidCrystal_I2C lcd(0x27, 16, 2);  
WiFiClient wifiClient;

float lastT = NAN, lastH = NAN;
bool lastSendOk = false;
String lastError = "";

bool firstRun = true;
unsigned long lastSend = 0;

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

void beepError() {
  digitalWrite(PIN_BUZZER, HIGH); delay(150);
  digitalWrite(PIN_BUZZER, LOW);
}

void showPage() {
  if (isnan(lastT)) {
    printLine(0, "Aguardando...");
    printLine(1, "");
    return;
  }
  char l0[20];
  snprintf(l0, sizeof(l0), "T:%.1fC U:%.0f%%", lastT, lastH);
  printLine(0, l0);
  printLine(1, lastSendOk ? "ThingSpeak OK" : ("Falha: " + lastError).c_str());
}

// Publica a leitura no canal do ThingSpeak. Retorna true se o ThingSpeak aceitou (HTTP 200).
bool publishReading(float t, float h) {
  if (WiFi.status() != WL_CONNECTED) { lastError = "sem WiFi"; return false; }

  ThingSpeak.setField(1, t);
  ThingSpeak.setField(2, h);
  int httpCode = ThingSpeak.writeFields(CHANNEL_ID, WRITE_API_KEY);

  if (httpCode == 200) return true;

  lastError = String(httpCode); 
  return false;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_OK, OUTPUT);
  pinMode(PIN_LED_ALERTA, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  dht.begin();
  lcd.init();
  lcd.backlight();
  printLine(0, "TemperaturaPI");
  printLine(1, "Iniciando...");
  delay(2000);  
  connectWifi();
  ThingSpeak.begin(wifiClient);
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
      lastSendOk = false;
      lastError = "sensor";
      Serial.println("Erro ao ler o DHT22");
    } else {
      lastT = t;
      lastH = h;
      lastSendOk = publishReading(t, h);
      Serial.printf("T=%.1f U=%.1f -> %s\n", t, h, lastSendOk ? "enviado" : ("falhou: " + lastError).c_str());
    }

    digitalWrite(PIN_LED_OK, lastSendOk ? HIGH : LOW);
    digitalWrite(PIN_LED_ALERTA, lastSendOk ? LOW : HIGH);
    if (!lastSendOk) beepError();

    showPage();
  }
}
