#!/usr/bin/env bash

set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input

python manage.py migrate --noinput

python manage.py shell << EOF
from apps.users.models import User

username = "fadima"
email = "fadimaouane@gmail.com"
password = "Brocard2026@"

user, created = User.objects.get_or_create(
    username=username,
    defaults={
        "email": email,
        "is_staff": True,
        "is_superuser": True,
        "role": "ADMIN"
    }
)

user.email = email
user.is_staff = True
user.is_superuser = True
user.role = "ADMIN"
user.set_password(password)
user.save()

print("Superuser créé ou mis à jour avec succès")
EOF