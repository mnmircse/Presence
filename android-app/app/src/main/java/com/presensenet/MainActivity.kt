package com.presensenet

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.presensenet.ui.navigation.AppNav
import com.presensenet.ui.theme.PresenseNetTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            PresenseNetTheme {
                AppNav()
            }
        }
    }
}
