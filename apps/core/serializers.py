from rest_framework import serializers
from .models import ActivityLog

class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    user_fullname = serializers.ReadOnlyField(source='user.get_full_name')

    class Meta:
        model = ActivityLog
        fields = ('id', 'user', 'username', 'user_fullname', 'timestamp', 'action', 'details')
