# dynamic bic flows

based on original code by Daniel Steinböck and Manuela Waldner, TU Wien
see: https://users.cg.tuwien.ac.at/~waldner/bicflows/

this version features support for arbitrary csv file loading & session handling for the server backend.

detailed setup instructions coming soon!



......
if you host the app on a server, you should create cronjob to clear server cache from time to time:
	*/20 * * * * wget -O - http://localhost/bipartite/clearcache >/dev/null 2>&1
