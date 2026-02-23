package com.presensenet.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apartment
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.CalendarMonth

import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

@Composable
fun LoginScreen(onLogin: () -> Unit) {

    var college_code by remember { mutableStateOf("") }
    var department by remember { mutableStateOf("") }
    var semester by remember { mutableStateOf("") }

    Surface(Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            Text("PresNet", style = MaterialTheme.typography.headlineLarge)

            Spacer(Modifier.height(32.dp))

            OutlinedTextField(
                value = college_code,
                onValueChange = { college_code = it },
                leadingIcon = { Icon(Icons.Default.Apartment, null) },
                label = { Text("College Code") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(16.dp))

            OutlinedTextField(
                value = department,
                onValueChange = { department = it },
                leadingIcon = { Icon(Icons.Default.School, null) },
                label = { Text("Department") },
                //visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(24.dp))

            OutlinedTextField(
                value = semester,
                onValueChange = { semester = it },
                leadingIcon = { Icon(Icons.Default.CalendarMonth, null) },
                label = { Text("Semester") },
                //visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = {
                    if (college_code == "KMEA" && department == "CSE" && semester == "S6") onLogin()
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Login")
            }
        }
    }
}
