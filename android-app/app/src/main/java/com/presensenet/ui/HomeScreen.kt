@file:OptIn(ExperimentalMaterial3Api::class)


package com.presensenet.ui

import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Camera
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.*


@Composable
fun HomeScreen(onCamera: () -> Unit) {

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("PresenceNet Dashboard") })
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = true,
                    onClick = {},
                    icon = { Icon(Icons.Default.Home, null) },
                    label = { Text("Home") }
                )

                NavigationBarItem(
                    selected = false,
                    onClick = onCamera,
                    icon = { Icon(Icons.Default.Camera, null) },
                    label = { Text("Scan") }
                )
            }
        }
    ) { padding ->
        Text(
            "Welcome to PresenceNet",
            modifier = Modifier.padding(padding)
        )
    }
}
