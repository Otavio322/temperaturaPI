/*
  Climora — ESP32 + DHT22 + display LCD I2C 16x2 + LEDs + buzzer
  Versão ThingSpeak (substitui a versão antiga que enviava para /api/device/readings)

  O que faz agora:
   1) Lê temperatura e umidade a cada SEND_EVERY_MS (padrão 20s).
   2) Publica os dois valores no canal do ThingSpeak (campo 1 = temperatura, campo 2 = umidade).
   3) Mostra no display a leitura e se o último envio deu certo.

  O que NÃO faz mais:
   - Não fala com o backend do Climora. Quem lê o ThingSpeak, avalia se está dentro do ideal
     da fruta e mostra o alerta é o painel web (o backend consulta o ThingSpeak periodicamente).
   - Por isso o LED/buzzer aqui só indicam "envio ok" ou "falha" — não indicam mais "fora do ideal".
     Esse alerta agora aparece no painel, não no aparelho.

  Bibliotecas (Sketch > Incluir Biblioteca > Gerenciar Bibliotecas):
    - "DHT sensor library" (Adafruit)  + "Adafruit Unified Sensor"
    - "LiquidCrystal I2C" (Frank de Brabander)
    - "ThingSpeak" (MathWorks) — é a biblioteca oficial, funciona normalmente pelo Arduino IDE.
  Placa: "ESP32 Dev Module" (pacote "esp32" da Espressif).

  Ligações (ESP32):
    DHT22  DATA -> GPIO 4  (VCC 3V3, GND; resistor 10k entre DATA e VCC se o módulo não tiver)
    LCD I2C SDA -> GPIO 21 | SCL -> GPIO 22 | VCC 5V | GND
    LED verde   -> GPIO 26 (resistor 220 ohms) | LED vermelho -> GPIO 27 (220 ohms)
    Buzzer ativo -> GPIO 25

  Um Arduino Uno NÃO tem Wi-Fi. Use ESP32/ESP8266, ou um Uno com módulo Wi-Fi/Ethernet.
*/

#include <WiFi.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "ThingSpeak.h"

// ======== CONFIGURE AQUI ========
const char* WIFI_SSID = "NOME_DA_SUA_REDE";
const char* WIFI_PASS = "SENHA_DA_REDE";

// ThingSpeak > seu canal > aba "API Keys"
unsigned long CHANNEL_ID = 0;                 // número do canal (ex.: 2345678)
const char* WRITE_API_KEY = "COLE_A_WRITE_API_KEY_AQUI";
// =================================

const int PIN_DHT = 4;
const int PIN_LED_OK = 26;
const int PIN_LED_ALERTA = 27;   // aqui vira "LED de falha", não mais "fora do ideal"
const int PIN_BUZZER = 25;

// O ThingSpeak (plano gratuito) exige um intervalo mínimo de ~15s entre envios por canal.
// Ficar abaixo disso faz o servidor recusar a atualização.
const unsigned long SEND_EVERY_MS = 20000;

DHT dht(PIN_DHT, DHT22);
LiquidCrystal_I2C lcd(0x27, 16, 2);  // se o display ficar em branco, tente o endereço 0x3F
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

  lastError = String(httpCode); // ex.: 401 (chave errada), 404 (canal errado), -301 (timeout)
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
  printLine(0, "Climora");
  printLine(1, "Iniciando...");
  delay(2000);  // o DHT22 precisa de ~2 s para a primeira leitura
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
