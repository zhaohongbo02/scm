# SCM

## Run it
### 1. Get the code

First, you need to get the code for this project from the Git repository. Please follow the steps below:

#### 1.1 Clone the project code

If you have not installed Git yet, please download and install Git from the Git official website.

Use the following command to clone the project code:

``` sh
git clone https://github.com/zhaohongbo02/scm.git
```

#### 1.2 Enter the project directory

After cloning successfully, enter the project directory:
``` sh
cd scm
```

### 2. Configure Python virtual environment

To ensure that your Python environment is consistent with the project's dependencies, it is recommended to use a virtual environment. Here are the steps to configure a Python virtual environment:

#### 2.1 Create a virtual environment

If you have Python 3 and the venv module installed (most modern versions of Python come with venv), you can create a virtual environment with the following command:

python3 -m venv venv

This will create a virtual environment called venv in the project directory.

#### 2.2 Activate the virtual environment

Depending on the operating system you are using, the way to activate the virtual environment varies:

- Windows:
``` sh
.\venv\Scripts\activate
```
- MacOS/Linux:
``` sh
source venv/bin/activate
```
After activation, the command line prompt will change to show the name of the virtual environment currently in use.

#### 2.3 Install dependencies

After the virtual environment is activated, use the requirements.txt file to install all project dependencies:

``` sh
pip install -r requirements.txt
```

This will install the libraries required by the project based on all the dependencies listed in requirements.txt.

### 3. Start the program

Once the program is configured, you can start the project with the following steps.

#### 3.1 Start the project

``` sh
cd backend
python app.py
```

#### 3.2 Access the application

After starting, by default, you can view the application by accessing the following address through the browser:

http://127.0.0.1:5000/

### 4. Stop the program

If you need to stop the running program, you can press Ctrl + C in the command line to terminate the process.


## Program Framework
![image](./figures/scmFramework.png)

## Data Models

### 1. SupplyChain
| **Field Name**          | **Data Type**              | **Required** |
|-----------------------|---------------------------|--------------|
| id                    | db.Integer               | YES (Primary Key)|
| name                  | db.String(80)            | YES           |
| created_at            | db.DateTime              | YES (Default current time)|
| updated_at            | db.DateTime              | YES（Default update time） |
| nodes                 | db.Integer              | YES (Default is 0)|
| edges                 | db.Integer              | YES (Default is 0)|
| has_latlon           | db.Boolean               | YES (Default is False)|
| has_layer            | db.Boolean               | YES (Default is False)|

### 2. Node
| **Field Name**          | **Data Type**              | **Required** |
|-----------------------|---------------------------|--------------|
| id                    | db.Integer               | YES (Primary Key)|
| node_id               | db.String(64)            | YES           |
| name                  | db.String(128)           | YES           |
| properties            | db.JSON                   | NO           |
| supply_chain_id      | db.Integer               | YES (Foreign key)  |


### 3. Edge
| **Field Name**          | **Data Type**              | **Required** |
|-----------------------|---------------------------|--------------|
| id                    | db.Integer               | YES (Primary Key)|
| edge_id               | db.Integer            | YES           |
| source_id             | db.Integer            | YES           |
| target_id             | db.Integer            | YES           |
| properties            | db.JSON               | NO           |
| supply_chain_id      | db.Integer             | YES (Foreign key) |