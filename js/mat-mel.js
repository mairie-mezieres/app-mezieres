python3 -c "
import sys
sys.path.insert(0, '/tmp')
from content_holder import CONTENT
sys.stdout.write(CONTENT)
" 2>/dev/null