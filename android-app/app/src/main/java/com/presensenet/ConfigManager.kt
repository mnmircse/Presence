package com.presensenet

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.dataStore by preferencesDataStore(name = "config")

object ConfigManager {

    private val SSID1 = stringPreferencesKey("ssid1")
    private val SSID2 = stringPreferencesKey("ssid2")
    private val SSID3 = stringPreferencesKey("ssid3")
    private val SERVER_URL = stringPreferencesKey("server_url")

    // 🔹 Save Server URL
    suspend fun saveServerUrl(context: Context, serverUrl: String) {
        context.dataStore.edit { preferences ->
            preferences[SERVER_URL] = serverUrl
        }
    }

    // 🔹 Get Server URL
    suspend fun getServerUrl(context: Context): String {
        val prefs = context.dataStore.data.first()
        return prefs[SERVER_URL] ?: ""
    }

    // 🔹 Save SSIDs
    suspend fun saveSSIDs(
        context: Context,
        ssid1: String,
        ssid2: String,
        ssid3: String
    ) {
        context.dataStore.edit { preferences ->
            preferences[SSID1] = ssid1
            preferences[SSID2] = ssid2
            preferences[SSID3] = ssid3
        }
    }

    // 🔹 Get SSIDs
    suspend fun getSSID1(context: Context): String {
        val prefs = context.dataStore.data.first()
        return prefs[SSID1] ?: ""
    }

    suspend fun getSSID2(context: Context): String {
        val prefs = context.dataStore.data.first()
        return prefs[SSID2] ?: ""
    }

    suspend fun getSSID3(context: Context): String {
        val prefs = context.dataStore.data.first()
        return prefs[SSID3] ?: ""
    }
}
