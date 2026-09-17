package runner

import (
	"context"
	"fmt"
	"regexp"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/models"
)

var validClientNameRegex = regexp.MustCompile(`^[a-zA-Z0-9_\-\.]{1,64}$`)

// ValidateClientName checks that client names do not contain special shell characters.
func ValidateClientName(name string) error {
	if !validClientNameRegex.MatchString(name) {
		return fmt.Errorf("invalid client name '%s': must match [a-zA-Z0-9_-.], length 1-64", name)
	}
	return nil
}

// AWGRunner defines the abstraction for interacting with AmneziaWG via manage_amneziawg.sh.
type AWGRunner interface {
	AddClient(ctx context.Context, name string) (*models.ClientResponse, error)
	RemoveClient(ctx context.Context, name string) error
	GetClient(ctx context.Context, name string) (*models.ClientResponse, error)
	ListClients(ctx context.Context) ([]models.ClientListItem, error)
	GetStats(ctx context.Context) (map[string]any, error)
	CheckHealth(ctx context.Context) bool
}
