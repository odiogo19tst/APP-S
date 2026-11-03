plugins { alias(libs.plugins.android.application) }
android {
    namespace = "io.github.odiogo19tst.jarvis.phone"
    compileSdk { version = release(37) }
    defaultConfig {
        applicationId = "io.github.odiogo19tst.jarvis.phone"
        minSdk = 30
        targetSdk = 37
        versionCode = 1
        versionName = "0.1.0-dev"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
dependencies { implementation(project(":jarvis-core")) }
