# mediatransparency

Create cronjob to clear cache sometimes:

*/20 * * * * wget -O - http://localhost/bipartite/clearcache >/dev/null 2>&1