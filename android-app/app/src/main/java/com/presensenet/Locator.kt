package com.presensenet

import android.content.*
import android.net.wifi.WifiManager
import kotlinx.coroutines.*
import kotlin.coroutines.resume
import kotlin.math.pow

data class Point(val x: Double, val y: Double)

data class RoomResult(
    val location: Point,
    val isInside: Boolean
)

sealed class LocatorResult {
    data class Success(val result: RoomResult) : LocatorResult()
    data class Error(val message: String) : LocatorResult()
}

class Locator(
    private val context: Context
) {

    private val wifiManager =
        context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

    private val ap1 = Point(-1.0, 0.0)
    private val ap2 = Point(0.0, -1.0)
    private val ap3 = Point(1.0, 0.0)

    private val roomCenter = Point(0.0, 0.0)
    private val roomRadius = 2.0

    suspend fun checkLocation(): LocatorResult {

        val ssid1 = ConfigManager.getSSID1(context)
        val ssid2 = ConfigManager.getSSID2(context)
        val ssid3 = ConfigManager.getSSID3(context)

        if (ssid1.isBlank() || ssid2.isBlank() || ssid3.isBlank()) {
            return LocatorResult.Error("SSID configuration missing")
        }

        // ⏳ 5 second timeout
        val result = withTimeoutOrNull(10000) {

            suspendCancellableCoroutine<LocatorResult> { continuation ->

                val receiver = object : BroadcastReceiver() {
                    override fun onReceive(ctx: Context?, intent: Intent?) {

                        val results = wifiManager.scanResults

                        var rssi1: Int? = null
                        var rssi2: Int? = null
                        var rssi3: Int? = null

                        for (network in results) {
                            if (network.SSID == ssid1) rssi1 = network.level
                            if (network.SSID == ssid2) rssi2 = network.level
                            if (network.SSID == ssid3) rssi3 = network.level
                        }

                        try { context.unregisterReceiver(this) } catch (_: Exception) {}

                        if (rssi1 == null)
                            return continuation.resume(
                                LocatorResult.Error("SSID not in range: $ssid1")
                            )

                        if (rssi2 == null)
                            return continuation.resume(
                                LocatorResult.Error("SSID not in range: $ssid2")
                            )

                        if (rssi3 == null)
                            return continuation.resume(
                                LocatorResult.Error("SSID not in range: $ssid3")
                            )

                        val roomResult = calculate(rssi1, rssi2, rssi3)

                        continuation.resume(
                            LocatorResult.Success(roomResult)
                        )
                    }
                }

                context.registerReceiver(
                    receiver,
                    IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
                )

                wifiManager.startScan()

                continuation.invokeOnCancellation {
                    try { context.unregisterReceiver(receiver) } catch (_: Exception) {}
                }
            }
        }

        // If timeout happens
        return result ?: LocatorResult.Error("WiFi scan timeout (5s)")
    }

    private fun calculate(r1: Int, r2: Int, r3: Int): RoomResult {

        val d1 = calculateDistance(r1, -48)
        val d2 = calculateDistance(r2, -48)
        val d3 = calculateDistance(r3, -49)

        val location = trilateration(ap1, d1, ap2, d2, ap3, d3)
        val inside = isInside(location)

        return RoomResult(location, inside)
    }

    private fun calculateDistance(rssi: Int, txPower: Int, n: Double = 2.7): Double {
        return 10.0.pow((txPower - rssi) / (10.0 * n))
    }

    private fun isInside(p: Point): Boolean {
        val dx = p.x - roomCenter.x
        val dy = p.y - roomCenter.y
        return (dx * dx + dy * dy) <= roomRadius * roomRadius
    }

    private fun trilateration(
        p1: Point, d1: Double,
        p2: Point, d2: Double,
        p3: Point, d3: Double
    ): Point {

        val A = 2 * (p2.x - p1.x)
        val B = 2 * (p2.y - p1.y)
        val C = d1*d1 - d2*d2 - p1.x*p1.x + p2.x*p2.x - p1.y*p1.y + p2.y*p2.y

        val D = 2 * (p3.x - p2.x)
        val E = 2 * (p3.y - p2.y)
        val F = d2*d2 - d3*d3 - p2.x*p2.x + p3.x*p3.x - p2.y*p2.y + p3.y*p3.y

        val denominator = (A * E - B * D)
        if (denominator == 0.0) return Point(0.0, 0.0)

        val x = (C * E - F * B) / denominator
        val y = (A * F - D * C) / denominator

        return Point(x, y)
    }
}
