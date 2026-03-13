# Backend Handler — Template Library

Pattern entspricht: `backend/cmd/*.go`

- DB helpers in `db.go`
- Handler in eigener Datei (z. B. `myitems.go`)
- Routen in `main.go`

## DB Helper (db.go)

```go
type MyItem struct {
  ID        int    `json:"id"`
  UserID    int    `json:"user_id"`
  Name      string `json:"name"`
  CreatedAt string `json:"created_at"`
}

func getMyItems(userID int) ([]MyItem, error) {
  rows, err := userDB.Query(
    `SELECT id, user_id, name, created_at FROM my_items WHERE user_id = ? ORDER BY id DESC`,
    userID,
  )
  if err != nil {
    return nil, err
  }
  defer rows.Close()

  var items []MyItem
  for rows.Next() {
    var item MyItem
    if err := rows.Scan(&item.ID, &item.UserID, &item.Name, &item.CreatedAt); err != nil {
      return nil, err
    }
    items = append(items, item)
  }
  return items, nil
}

func createMyItem(userID int, name string) (MyItem, error) {
  res, err := userDB.Exec(
    `INSERT INTO my_items (user_id, name) VALUES (?, ?)`,
    userID, name,
  )
  if err != nil {
    return MyItem{}, err
  }
  id, _ := res.LastInsertId()
  return MyItem{ID: int(id), UserID: userID, Name: name}, nil
}

func deleteMyItem(id, userID int) error {
  _, err := userDB.Exec(`DELETE FROM my_items WHERE id = ? AND user_id = ?`, id, userID)
  return err
}
```

## Migration (initDB in db.go)

```go
userDB.Exec(`CREATE TABLE IF NOT EXISTS my_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    name       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
)`)
```

## Handler File (myitems.go)

```go
func handleMyItems(w http.ResponseWriter, r *http.Request) {
  user, err := getSessionUser(r)
  if err != nil {
    http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
    return
  }

  switch r.Method {

  case http.MethodGet:
    items, err := getMyItems(user.ID)
    if err != nil {
      jsonError(w, "Fehler beim Laden", http.StatusInternalServerError)
      return
    }
    if items == nil {
      items = []MyItem{}
    }
    jsonOK(w, items)

  case http.MethodPost:
    var body struct {
      Name string `json:"name"`
    }
    if err := decodeJSON(r, &body); err != nil || body.Name == "" {
      jsonError(w, "Ungültige Anfrage", http.StatusBadRequest)
      return
    }
    item, err := createMyItem(user.ID, body.Name)
    if err != nil {
      jsonError(w, "Erstellen fehlgeschlagen", http.StatusInternalServerError)
      return
    }
    w.WriteHeader(http.StatusCreated)
    jsonOK(w, item)

  default:
    http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
  }
}

func handleMyItemByID(w http.ResponseWriter, r *http.Request) {
  user, err := getSessionUser(r)
  if err != nil {
    http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
    return
  }

  id := parseIDFromPath(r.URL.Path) // helper: strconv.Atoi(last path segment)

  switch r.Method {
  case http.MethodDelete:
    if err := deleteMyItem(id, user.ID); err != nil {
      jsonError(w, "Löschen fehlgeschlagen", http.StatusInternalServerError)
      return
    }
    w.WriteHeader(http.StatusNoContent)

  default:
    http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
  }
}
```

## Route Registration (main.go)

```go
mux.HandleFunc("/api/my-items",  authMiddleware(handleMyItems))
mux.HandleFunc("/api/my-items/", authMiddleware(handleMyItemByID))
```
