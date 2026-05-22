import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm") version "1.9.23"
    kotlin("plugin.serialization") version "1.9.23"
    id("io.ktor.plugin") version "2.3.10"
    application
}

group = "com.sumup"
version = "1.0.0"

application {
    mainClass.set("com.sumup.salon.ApplicationKt")
}

repositories {
    mavenCentral()
}

val ktorVersion    = "2.3.10"
val exposedVersion = "0.44.1"
val kotlinVersion  = "1.9.23"

dependencies {
    // Ktor server
    implementation("io.ktor:ktor-server-core:$ktorVersion")
    implementation("io.ktor:ktor-server-netty:$ktorVersion")
    implementation("io.ktor:ktor-server-content-negotiation:$ktorVersion")
    implementation("io.ktor:ktor-server-cors:$ktorVersion")
    implementation("io.ktor:ktor-server-status-pages:$ktorVersion")
    implementation("io.ktor:ktor-server-call-logging:$ktorVersion")
    implementation("io.ktor:ktor-serialization-kotlinx-json:$ktorVersion")

    // Exposed ORM + SQLite
    implementation("org.jetbrains.exposed:exposed-core:$exposedVersion")
    implementation("org.jetbrains.exposed:exposed-dao:$exposedVersion")
    implementation("org.jetbrains.exposed:exposed-jdbc:$exposedVersion")
    implementation("org.xerial:sqlite-jdbc:3.44.1.0")

    // Logging
    implementation("ch.qos.logback:logback-classic:1.4.14")

    // Tests
    testImplementation("io.ktor:ktor-server-test-host:$ktorVersion")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit:$kotlinVersion")
}

tasks.withType<KotlinCompile> {
    kotlinOptions.jvmTarget = "17"
}

// FIX: Use Ktor's built-in fatJar task (not shadowJar which requires a separate plugin)
ktor {
    fatJar {
        archiveFileName.set("salon-explorer.jar")
    }
}
