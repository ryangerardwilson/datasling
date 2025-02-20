# Datasling

A minimalistic SQL-querying GUI tool, sans inherent ugliness of commercial software.

## 1. Prerequisites

- Ubuntu 24.04 LTS

## 2. Installation

    bash -c "sh <(curl -fsSL https://files.ryangerardwilson.com/datasling/install.sh)"

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


