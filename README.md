# Datasling

A minimalistic SQL-querying GUI tool, sans inherent ugliness of commercial software.

## 1. Prerequisites

- Ubuntu 24.04 LTS

## 2. Installation

    curl -fsSL https://files.ryangerardwilson.com/datasling/debian/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/datasling.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/datasling.gpg] https://files.ryangerardwilson.com/datasling/debian stable main" | sudo tee /etc/apt/sources.list.d/datasling.list
    sudo apt update
    sudo apt-get install datasling
    sudo chown root:root /usr/lib/datasling/chrome-sandbox
    sudo chmod 4755 /usr/lib/datasling/chrome-sandbox

## 3. Subsequent Updates

    sudo apt update
    sudo apt install --only-upgrade datasling

## 4. Usage

Simply run the below command.

    datasling

Then query your databases.

    @preset::<PRESET_1_NAME>
    select top 10 * from t1;

    select top 10 * from t2;

    select top 10 * from t3;

    @preset::<PRESET_2_NAME>
    select top 10 * from t4;

    select top 10 * from t5;

    select top 10 * from t6;

## 5. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


