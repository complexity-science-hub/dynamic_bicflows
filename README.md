# dynamic bic flows

Based on [original code](https://users.cg.tuwien.ac.at/~waldner/bicflows/)  by Daniel Steinböck and Manuela Waldner, TU Wien.

This version features support for arbitrary csv file loading & session handling for the server backend.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

##### Install Python3
- Download and install [Python](https://www.python.org/downloads/) on your machine.

*You may also have to add the location of python to your `PATH` environment variable.*

- Install pip for Python 3 as described here for [Windows](https://www.liquidweb.com/kb/install-pip-windows/) or [Linux](https://wiki.ubuntuusers.de/pip/).

*You may also have to add the location of pip to your `PATH` environment variable.*

### Installing

In the project's root directory execute the following command to install required dependencies:

```
pip install -r requirements.txt
```

Set the `FLASK_APP` environment variable to `server.py`

###### Linux:
```
export FLASK_APP=server.py
```

###### Windows (Command Prompt):
```
set FLASK_APP=server.py
```

###### Windows (Powershell):
```
$env:FLASK_APP="server.py"
```

### Run the application
To run the application, execute the following command:
```
python -m flask run
```

Open `http://127.0.0.1:5000/` in your browser.

## Deployment

One way to deploy the project on a live sever is to use *Apache* and *mod_wsgi*.

e.g. for Apache site configuration:
```ApacheConf
<VirtualHost *:80>
    WSGIDaemonProcess dynamic_bicflows user=www-data group=www-data threads=1
    WSGIScriptAlias /dynamic_bicflows /var/www/FLASKAPPS/dynamic_bicflows/bipartite.wsgi
    WSGIProcessGroup dynamic_bicflows

    Alias /static/ /static/var/www/FLASKAPPS/dynamic_bicflows/static
    ErrorLog /var/www/FLASKAPPS/dynamic_bicflows/logs/error.log
    CustomLog /var/www/FLASKAPPS/dynamic_bicflows/logs/access.log combined

    <Directory /var/www/FLASKAPPS/dynamic_bicflows/static>
        Require all granted
    </Directory>
</VirtualHost>
```

##### Clear cache
For faster access datasets are kept in memory. If you host the app on a server, you should create a *cronjob* to clear server cache from time to time:

```
*/20 * * * * wget -O - http://localhost/bipartite/clearcache >/dev/null 2>&1
```