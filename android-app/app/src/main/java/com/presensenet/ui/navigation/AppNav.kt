package com.presensenet.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.*
import com.presensenet.ui.*

@Composable
fun AppNav() {

    val nav = rememberNavController()

    NavHost(
        navController = nav,
        startDestination = "login"
    ) {

        composable("login") {
            LoginScreen {
                nav.navigate("home") {
                    popUpTo("login") { inclusive = true }
                }
            }
        }

        composable("home") {
            HomeScreen(
                onCamera = { nav.navigate("camera") }
            )
        }

        composable("camera") {
            CameraScreen(
                onOpenSettings = { nav.navigate("settings") }
            )
        }

        composable("settings") {
            SettingsScreen(
                onBack = { nav.popBackStack() }
            )
        }
    }
}
