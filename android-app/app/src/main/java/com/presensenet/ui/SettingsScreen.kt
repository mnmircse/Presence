package com.presensenet.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.presensenet.ConfigManager
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(onBack: () -> Unit) {

    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var ssid1 by remember { mutableStateOf("") }
    var ssid2 by remember { mutableStateOf("") }
    var ssid3 by remember { mutableStateOf("") }
    var serverUrl by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("") }

    // 🔹 Load saved SSIDs when screen opens
    LaunchedEffect(Unit) {
        ssid1 = ConfigManager.getSSID1(context)
        ssid2 = ConfigManager.getSSID2(context)
        ssid3 = ConfigManager.getSSID3(context)
        serverUrl = ConfigManager.getServerUrl(context)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {

        Text(
            text = "Configure Server URL",
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(24.dp))

        OutlinedTextField(
            value = serverUrl,
            onValueChange = { serverUrl = it },
            label = { Text("Server Url") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Configure Access Points",
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(24.dp))

        OutlinedTextField(
            value = ssid1,
            onValueChange = { ssid1 = it },
            label = { Text("SSID 1") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = ssid2,
            onValueChange = { ssid2 = it },
            label = { Text("SSID 2") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = ssid3,
            onValueChange = { ssid3 = it },
            label = { Text("SSID 3") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            modifier = Modifier.fillMaxWidth(),
            onClick = {

                if (ssid1.isBlank() || ssid2.isBlank() || ssid3.isBlank() || serverUrl.isBlank()) {
                    status = "❌ All SSIDs and Server url must be filled"
                    return@Button
                }

                scope.launch {
                    ConfigManager.saveSSIDs(context, ssid1, ssid2, ssid3)
                    ConfigManager.saveServerUrl(context, serverUrl)
                    status = "✅ Configuration Saved"
                }
            }
        ) {
            Text("Save Configuration")
        }

        Spacer(modifier = Modifier.height(16.dp))


        Button(
            modifier = Modifier.fillMaxWidth(),
            onClick = onBack
        ) {
            Text("Back")
        }
        Spacer(modifier = Modifier.height(16.dp))

        if (status.isNotBlank()) {
            Text(
                text = status,
                color = if (status.startsWith("❌"))
                    MaterialTheme.colorScheme.error
                else
                    MaterialTheme.colorScheme.primary
            )
        }
    }
}
